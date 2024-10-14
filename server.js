const express = require('express');
const ytdl = require('yt-dlp-exec');

const app = express();

app.get('/audio', async (req, res) => {
  const videoUrl = req.query.url; // YouTube video URL passed from the app
  try {
    const info = await ytdl(videoUrl, {
      format: 'bestaudio',
      dumpSingleJson: true,
    });

    const audioUrl = info.url; // Extracted audio URL
    res.json({audioUrl});
  } catch (error) {
    res.status(500).send('Error extracting audio');
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
