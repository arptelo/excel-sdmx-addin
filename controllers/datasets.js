const mongoose = require('mongoose'),
  Dataset = mongoose.model('Dataset');

exports.createDataset = (req, res) => {
  let dataset = new Dataset(req.body);
  dataset.save( (err, dataset) => {
    if (err) return res.status(500).send({ err });
    return res.status(201).send(dataset._id);
  });
};

exports.getDatasets = (req, res) => {
  Dataset.find(
    { $text : { $search : req.query.queryString }, provider: req.query.provider }, 
    { score : { $meta: "textScore" } }
  ).sort({ score : { $meta : 'textScore' } })
  .exec(function(err, datasets) {
    if (err) return res.status(500).send({ err });
    return res.status(200).json(datasets);
  });
};