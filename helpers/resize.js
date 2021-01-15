var http = require('http');
var https = require('https');
var fs = require('fs');
var sharp = require('sharp');
var fs = require('fs');
var AWS = require('aws-sdk');
const env = require('./config/env');

module.exports = function resizeImage(imageUri, sizes) {
  return new Promise((resolve, reject) => {
    // determine wether we need to use `http` or `https` libs
    var httpLib = http;
    if ( /^https/.test(imageUri) ) {
      httpLib = https;
    }
    // begin reading the image
    httpLib.get(imageUri, function(downloadStream) {
      downloadStream.on('error', reject);
      Promise.all(
        sizes.map((size) => resizeAndSave(downloadStream, size))
      )
      .then(resolve)
      .catch(reject);
    });
  });

  function resizeAndSave(downloadStream, size) {
    var resizeTransform = sharp().resize(size[0], size[1]).max();
    return new Promise((resolve, reject) => {
      //console.log('WRITING', outPath);
      var outPath = `./tmp/output-${ size[0] }x${ size[1] }.jpg`;
      var writeStream = fs.createWriteStream(outPath);
      downloadStream.pipe(resizeTransform).pipe(writeStream);
      downloadStream.on('end', () => resolve(outPath));
      writeStream.on('error', reject);
      resizeTransform.on('error', reject);
    });
  }
}


app.get('/images', (req, res) => {
    resizeImage('https://images.unsplash.com/photo-1427805371062-cacdd21273f1?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&s=7bd7472930019681f251b16e76e05595', [
      [300, 300,],
      [600, 450,],
    ])
    .then((thumbnailPaths) => {
      console.log('DONE', thumbnailPaths)
      let buff = fs.readFileSync('./output-600x450.jpg');
      let base64data = buff.toString('base64');
      AWS.config.accessKeyId = env.aws_accessKeyId;
      AWS.config.secretAccessKey = env.aws_secretAccessKey;
      AWS.config.region = env.aws_region;
      let s3 = new AWS.S3();
      var params = {
          Bucket: env.aws_bucket,
          Key: `output-300x300.jpg`,
          Body: buff,
          ACL: 'public-read',
          ContentType: 'image/jpeg',
          Expires: 60,
          ContentEncoding: 'base64'
      };
      s3.putObject(params, function (err, data) {
          //console.log("PRINT FILE:", file);
          if (err) {
              console.log('ERROR MSG: ', err);
              //res.status(500).send(err);
          } else {
              console.log('Successfully uploaded data');
              //res.status(200).end();
          }
          /* fs.unlink(outPath, function (err) {
              if (err) {
                  console.error(err);
              }
              console.log('Temp File Delete');
          }); */
      });
      res.json(thumbnailPaths)
    })
    .catch((err) => res.json(err));
});