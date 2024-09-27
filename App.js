import {StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';

const App = () => {
  const [Data, setData] = useState(undefined);

  const getAPIData = async () => {
    const url = 'https://jsonplaceholder.typicode.com/posts';
    let res = await fetch(url);
    res = await res.json();
    setData(res);
    // console.warn('hello');
  };

  useEffect(() => {
    getAPIData();
  }, []);

  return (
    <View style={styles.font}>
      <Text style={styles.font}>Hello World!</Text>
      {Data.length ? 
        Data.map((item)=>{
        <View >
          <Text style={styles.font2}>{item?.id}</Text>
          <Text style={styles.font2}>{item?.userId}</Text>
          <Text style={styles.font2}>{item?.title}</Text>
          <Text style={styles.font2}>{item?.body}</Text>
        </View>
        }) : null}
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  font: {
    fontSize: 25,
    color: 'blue',
  },
  font2: {
    fontSize: 15,
    color: 'blue',
  },
});
