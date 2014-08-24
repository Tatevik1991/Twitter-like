var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/twitdb');

var schemaMessage = mongoose.Schema({
	message:String,
});
var schemaShortUrl = mongoose.Schema({
	link: String,
});
var schemaHashtag = mongoose.Schema({
	hashtag: String,
	message_id: String,
});

module.exports = {
	messagesList: mongoose.model('message', schemaMessage),
	sUrl: mongoose.model('sUrl', schemaShortUrl),
	hashtag: mongoose.model('hashtag', schemaHashtag)
};
