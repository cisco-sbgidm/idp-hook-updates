const app = require('./server');

const {
  PORT = 3000,
} = process.env;

// listen for requests :)
app.listen(PORT, () => {
  console.log(`Your app is listening on port ${PORT}`);
});