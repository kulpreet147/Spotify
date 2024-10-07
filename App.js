import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import base64 from 'react-native-base64';
import TrackPlayer, {
  useProgress,
  useTrackPlayerEvents,
  Event,
  RepeatMode,
} from 'react-native-track-player';
import {pause, play} from './assets/svg';
import {SvgXml} from 'react-native-svg';
const apiPrefix = 'https://accounts.spotify.com/api';
const apiEndpoint = 'https://api.spotify.com/v1';
const clientId = '602849a078c741bf9caf8939a43ef8c0';
const clientSecret = '77437aeea8ea402c96a4ba6ce0ca8fc5';

const PlayerControls = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const progress = useProgress();
  const [currentTrack, setCurrentTrack] = useState(null);
  useTrackPlayerEvents([Event.PlaybackTrackChanged], async event => {
    if (event.type === Event.PlaybackTrackChanged) {
      const track = await TrackPlayer.getTrack(event.nextTrack);
      setCurrentTrack(track);
    }
  });
  const togglePlayback = async () => {
    // const currentState = await TrackPlayer.getState();
    if (isPlaying) {
      await TrackPlayer.pause();
      setIsPlaying(false);
    } else {
      await TrackPlayer.play();
      setIsPlaying(true);
    }
  };
  if (!currentTrack) return null;
  return (
    <View style={styles.playerControls}>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progress,
            {
              width: `${(progress.position / progress.duration) * 100}%`,
            },
          ]}
        />
      </View>
      <View style={styles.controlsContainer}>
        <View style={styles.trackInfoContainer}>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={togglePlayback}>
          {isPlaying ? (
            <SvgXml xml={pause} height={20} width={20} />
          ) : (
            <SvgXml xml={play} height={20} width={20} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
const App = () => {
  const [accessToken, setAccessToken] = useState('');
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const base64Credentials = base64.encode(clientId + ':' + clientSecret);

  const setUpPlayer = async () => {
    try {
      await TrackPlayer.setupPlayer();
    } catch (e) {
      console.error('Failed to setup player: ', e);
    }
  };
  const getAccessToken = async () => {
    try {
      const response = await fetch(`${apiPrefix}/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${base64Credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error('Failed to obtain access token');
      }

      const data = await response.json();
      setAccessToken(data.access_token);
    } catch (err) {
      setError('Error obtaining access token: ' + err.message);
    }
  };
  const searchTracks = async () => {
    if (!accessToken || !searchQuery) return;
    setIsSearching(true);

    try {
      const response = await fetch(
        `${apiEndpoint}/search?q=${encodeURIComponent(searchQuery)}&type=track`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to search tracks');
      }

      const data = await response.json();
      console.log('first>>>>>>>>>>>,', data);
      setTracks(data.tracks.items);
      setSearchQuery(null);
    } catch (err) {
      setError('Error searching tracks: ' + err.message);
    }
  };

  const playTrack = async item => {
    if (!item.preview_url) {
      console.log('No preview available for:', item.name);
      return;
    }
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: item.id,
        url: item.preview_url,
        title: item.name,
        artist: item.artists[0].name,
        artwork: item.album.images[0].url,
      });
      await TrackPlayer.play();
    } catch (err) {
      console.error('Error playing track:', err);
    }
  };

  const fetchNewReleases = async () => {
    if (!accessToken) return;
    try {
      const albumResponse = await fetch(
        `${apiEndpoint}/browse/new-releases?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!albumResponse.ok) {
        throw new Error('Failed to fetch new releases');
      }
      const albumData = await albumResponse.json();
      const trackPromises = albumData.albums.items.map(async album => {
        const tracksResponse = await fetch(
          `${apiEndpoint}/albums/${album.id}/tracks?limit=1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!tracksResponse.ok) {
          return null;
        }
        const tracksData = await tracksResponse.json();
        const track = tracksData.items[0];
        const fullTrackResponse = await fetch(
          `${apiEndpoint}/tracks/${track.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!fullTrackResponse.ok) {
          return null;
        }
        const fullTrackData = await fullTrackResponse.json();
        return {
          ...fullTrackData,
          album: album,
        };
      });
      const tracks = (await Promise.all(trackPromises)).filter(
        track => track !== null && track.preview_url,
      );
      setTracks(tracks);
    } catch (err) {
      setError('Error fetching new releases: ' + err.message);
    }
  };

  useEffect(() => {
    setUpPlayer();
    getAccessToken();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchNewReleases();
    }
  }, [accessToken]);

  useEffect(() => {
    const RepeatSong = async () => {
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
    };
    RepeatSong();
  }, []);

  const renderItem = ({item}) => {
    if (!item || !item?.preview_url) return null;

    let imageUrl, name, artistName;

    if (isSearching) {
      imageUrl =
        item.album && item.album.images && item.album.images[0]
          ? item.album.images[0].url
          : null;
      name = item.name;
      artistName =
        item.artists && item.artists[0]
          ? item.artists[0].name
          : 'Unknown Artist';
    } else {
      imageUrl = item.images && item.images[0] ? item.images[0].url : null;
      name = item.name;
      artistName =
        item.artists && item.artists[0]
          ? item.artists[0].name
          : 'Unknown Artist';
    }

    if (!imageUrl) return null;
    return (
      <TouchableOpacity
        style={styles.trackItem}
        onPress={() => playTrack(item)}>
        <Image source={{uri: imageUrl}} style={styles.albumArt} />
        <View style={styles.trackInfo}>
          <Text style={styles.trackName}>{name}</Text>
          <Text style={styles.artistName}>{artistName}</Text>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <LinearGradient
      colors={['#A34C0D', '#592804', '#241001', '#111111']}
      style={styles.linearGradient}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          onChangeText={setSearchQuery}
          value={searchQuery}
          placeholder="Search for a song"
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.button} onPress={searchTracks}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Text style={styles.header}>
          {isSearching ? 'Search Results' : 'New Releases'}
        </Text>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{paddingBottom: 100}}
          />
        )}
      </View>
      <PlayerControls />
    </LinearGradient>
  );
};
export default App;
const styles = StyleSheet.create({
  linearGradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#704830',
    borderRadius: 20,
    paddingLeft: 15,
    color: 'white',
  },
  button: {
    backgroundColor: '#1DB954',
    padding: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  trackInfo: {
    marginLeft: 10,
  },
  trackName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  artistName: {
    fontSize: 14,
    color: '#ccc',
  },
  error: {
    color: 'red',
    fontSize: 16,
  },
  playerControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: '#4F4F4F',
    borderRadius: 3,
  },
  progress: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 3,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  trackInfoContainer: {
    flex: 1,
    marginRight: 20,
  },
  nowPlayingTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nowPlayingArtist: {
    color: '#BABABA',
    fontSize: 12,
  },
  playPauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1DB954',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
