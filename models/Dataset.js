var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var datasetSchema = Schema({
  datasetId: String,
  title: {type: String, required: true},
  agencyId: String,
  dsdId: String,
  provider: {type: String, enum: ['ECB', 'Eurostat', 'IMF', 'OECD', 'United Nations', 'FAO', 'ILO', 'UNESCO', 'World Integrated Trade Solution', 'World Bank', 'KNOEMA', 'Widukind']}
});

datasetSchema.index({ title: 'text' });

module.exports = mongoose.model('Dataset', datasetSchema);