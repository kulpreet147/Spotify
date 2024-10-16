const express = require("express");
const cors = require('cors');
const ytdl = require("yt-dlp-exec");

const app = express();

app.use(cors());

app.get("/audio", async (req, res) => {
  console.log('REQUEST>>>>>>>>>>>>>>>>',req);
  const videoUrl = req.query.url; 
  try {
    const info = await ytdl(videoUrl, {
      format: 'worstaudio',
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      noCheckCertificates: true,
    });
    

    const audioUrl = info.url; // Extracted audio URL
    res.json({ audioUrl });
  } catch (error) {
    res.status(500).send("Error extracting audio");
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
