const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/musicapp', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Song schema and model
const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  genre: String,
  filePath: String,
  isDeleted: { type: Boolean, default: false } // Add isDeleted field
});
const Song = mongoose.model('Song', songSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Routes
app.get('/api/songs', async (req, res) => {
  try {
    const songs = await Song.find({ isDeleted: false }); // Fetch only non-deleted songs
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/recycle-bin', async (req, res) => {
  try {
    const songs = await Song.find({ isDeleted: true }); // Fetch only deleted songs
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/songs', upload.single('file'), async (req, res) => {
  const { title, artist } = req.body;
  const filePath = req.file.path;

  console.log('File uploaded to:', filePath); // Add this line to debug

  try {
    // Request genre from ML service
    // const mlResponse = await axios.post('http://localhost:5005/predict-genre', { filePath });
    // const genre = mlResponse.data.genre; // Assuming the response contains the genre
const genre = "Jazz";
    const song = new Song({
      
      title,
      artist,
      genre,
      filePath
    });

    const newSong = await song.save();
    res.status(201).json(newSong);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/songs/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: 'Song not found' });

    song.isDeleted = true; // Mark song as deleted
    await song.save();
    res.json({ message: 'Song moved to recycle bin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/recycle-bin/:id/restore', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    song.isDeleted = false; // Restore song
    await song.save();
    res.json({ message: 'Song restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/recycle-bin/:id', async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      console.error(`Song with id ${req.params.id} not found`); // Add this line to debug
      return res.status(404).json({ message: 'Song not found' });
    }

    await song.remove(); // Permanently delete the song
    res.json({ message: 'Song permanently deleted' });
  } catch (err) {
    console.error(`Error deleting song with id ${req.params.id}:`, err); // Add this line to debug
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
