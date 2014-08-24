var express = require('express'),
	path = require('path'),
	fs = require('fs'),
	ejs = require('ejs'),
	bodyParser = require('body-parser'),
    db = require('./db.js'),
    request = require('request'),
    Recaptcha = require('recaptcha').Recaptcha,
    querystring = require('querystring'),
	app = express();
	
	var PUBLIC_KEY  = '6LeaCfkSAAAAAACIoQhL3J8h6zy27CZnCSPWivC0',
        PRIVATE_KEY = '6LeaCfkSAAAAAC0N_EvRMVP1PKVNy8QqEwWyVz6h';

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended : true
// }));

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', function(req, res, next) {
	var recaptcha = new Recaptcha(PUBLIC_KEY, PRIVATE_KEY);

	res.render('form', {recaptcha_form: recaptcha.toHTML()});
});

app.get('/result', function(req, res, next) {
    res.redirect('/');
});

app.get('/s/:surl', function(req, res, next) {
	// select url from surl tables where id = req.params.surl;
	// res.redirect(url);
	db.sUrl.find({_id: req.params.surl}, function(err, data){
	    if (err) return console.error(err);
	    if (data != undefined && data.length > 0 && data[0].link != undefined)
	    // console.log(data[0].link);
	    res.redirect(data[0].link);
	});
});

app.get('/h/:hashtag', function(req, res, next){
	var messagesHtml = "";
	db.hashtag.find({hashtag : req.params.hashtag}, function(err,data){
		if(err) {return console.error(err);}
		else if(data != undefined && data.length > 0) {
			var ids = new Array();
			for (var i = 0; i < data.length; i++) {
				ids.push(data[i].message_id);
			};
			db.messagesList.find({_id: {'$in': ids}}, function(mErr, mData){
				if(err) {return console.error(err);}
				else console.log(mData);
				for (var i = 0; i < mData.length; i++) {
					messagesHtml += "<p>" + mData[i].message + "</p>\n";
				};
	 			res.render('messagesList', {messagesList: messagesHtml});
			});
		}
		else {
			res.render('messagesList', {messagesList: "no messages found with this hashtags"});
		}
	});
});  

app.post('/result', function(req, res) {
	var chunk = '';
    req.on('data', function (data) {
        chunk += data;
    });

    req.on('end', function () {
    	//messages insert, get last-id, 
    	//where I must create messages model? like this var messagesModel= new db.message();
        var parsedObject = querystring.parse(chunk);
		var data = {
			remoteip:  req.connection.remoteAddress,
			challenge: parsedObject.recaptcha_challenge_field,
			response:  parsedObject.recaptcha_response_field
		};
		var recaptcha = new Recaptcha(PUBLIC_KEY, PRIVATE_KEY, data);

		recaptcha.verify(function(success, error_code) {
		if (success) {
			var links = parsedObject.message.match(/(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim);
			        // request(links, function(err,res,body){
           //     		res.headers['content-type'];
           //     });
			        //console.log(links);
			        var mObj = {
			        	message: parsedObject.message
			        };
			        var message = new db.messagesList(mObj);
					message.save(function(err){
				    	if(!err){console.log("Saved");}
				    });
					var mId = message.get("_id");
			if (links != null && links != undefined)
				for (var i = 0; i < links.length; i++) {
					if (links[i] != null && links[i] != undefined && links[i].match(/\.(png|jpg|jpeg|gif)$/gi) == null){
						var obj = {
							link: links[i]
						};
						var linkUrl = '';
						var sUrl = new db.sUrl(obj);

						sUrl.save(function(err){
					        if(!err){console.log("Saved");}
					      });
						var tmpId = sUrl.get("_id");
						linkUrl = 'http://localhost:3000/s/' + tmpId;
						parsedObject.message = parsedObject.message.replace(links[i], "<a href='" + linkUrl + "'>" + linkUrl + "</a>");
					} else {
						parsedObject.message = parsedObject.message.replace(links[i], "<img src='" + links[i] + "'/>");
					}
				};
			var tags = parsedObject.message.match(/(\S*#\[[^\]]+\])|(\S*#\S+)/gi);

			if (tags != null && tags != undefined)
				for (var j = 0; j < tags.length; j++) {
					var obj = {
							hashtag:tags[j].replace('#', ''),
							message_id: mId + ""
						};
						var linkUrl = ' ';
						console.log(obj);
						var hashtagUrl = new db.hashtag(obj);
						hashtagUrl.save(function(err){
							if (!err) {console.log("hashtag saved");}
							else console.log(err);
						});
					//var hashId = hashtagUrl.get("_id");
					linkUrl = 'http://localhost:3000/h/' + tags[j].replace('#', '');
            		parsedObject.message = parsedObject.message.replace(tags[j], "<a href='" + linkUrl + "'>" + tags[j] + "</a>");	
				};

			console.log(parsedObject.message);
			message.set({message:parsedObject.message});
			message.save(function(err){
		    	if(!err){console.log("Message data updated");}
		    	else console.log("error updating message data" + err);
		    });
			db.messagesList.update({_id: mId}, {$set: {message: parsedObject.message}});
			res.render('result', {result_message: parsedObject.message});
		}
		else {
			console.log("error");
			res.redirect('/');
		}
		});
    });
});

app.listen(3000, function(err){
	if (!err) {
		console.log("Listening: 3000");}
});