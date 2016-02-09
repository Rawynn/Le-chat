var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	users = {};
	usersColors={};
	ip={}
var randomColour= require(__dirname+'/public/js/randomColor');	
var port = process.env.PORT || 3000


var pg =require('pg');



server.listen(port);
app.use("/public", express.static(__dirname + '/public'));
app.use("/node_modules", express.static(__dirname + '/node_modules'));

app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function(socket){
	socket.on('new user', function(data, callback){
		if (data in users){
			callback(false);
		} else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
			var kolor=randomColour.randomColor();
			usersColors[socket.nickname]=kolor;
			var address = socket.handshake.address;
			ip[socket.nickname]=address;

			var client = new pg.Client(process.env.DATABASE_URL);
			
			pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done){
				if (err) {return console.error('error fetching client from pool', err);}
			  	console.log('Connected to postgres! Getting schemas...');

			  	client.query('SELECT * FROM public.msgs;', function(err, result){
			  		done();
			  		client.on('row', function(row) {
			      console.log(JSON.stringify(row) ); })
			  		if(err) {
				      return console.error('error running query', err);
				    }
			  	})
			   /* .on('row', function(row) {
			      console.log(JSON.stringify(row));
			    });*/
				client.end();
			});
		}
	});
	
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}

	socket.on('send message', function(data, callback){
		var msg = data['wiad'].trim();
		console.log('after trimming message is: ' + msg);
		if(msg.substr(0,3) === '/w '){
			msg = msg.substr(3);
			var ind = msg.indexOf(' ');
			if(ind !== -1){
				var name = msg.substring(0, ind);
				var msg = msg.substring(ind + 1);
				if(name in users){
					users[name].emit('whisper', {msg: msg, nick: socket.nickname});
					console.log('message sent is: ' + msg);
					console.log('Whisper!');
				} else{
					callback('Proszę wprowadzić poprawną nazwę użytkownika.');
				}
			} else{
				callback('Proszę wprowadzić treść whispera.');
			}
		} else{
			io.sockets.emit('new message', {msg: msg, nick: socket.nickname, color: usersColors[socket.nickname]});
			/*pg.connect(process.env.DATABASE_URL, function(err, client){
			if (err) throw err;
			  console.log('Connected to postgres! Getting schemas...');

			  client
			    .query('INSERT INTO public.msgs (nick,msg,date,ip) VALUES ('Pies','no, hej', '06-02-2016','192.168.0.1');')
			    .on('row', function(row) {
			      console.log(JSON.stringify(row));
			    });
			})*/
		}
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
	});
});