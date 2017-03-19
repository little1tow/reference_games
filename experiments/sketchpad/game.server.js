/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/
    var
        fs    = require('fs'),
        utils = require('../sharedUtils/sharedUtils.js');




// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
var onMessage = function(client,message) {
  //Cut the message up into sub components
  var message_parts = message.split('.');
  // console.log('message_parts from inside onMessage');
  // console.log(message_parts);
  // console.log(message_parts[1]);
  //The first is always the type of message
  var message_type = message_parts[0];
  
  //Extract important variables
  var gc = client.game;
  var id = gc.id.slice(0,6);
  var all = gc.get_active_players();
  var target = gc.get_player(client.userid);
  var others = gc.get_others(client.userid);  
  switch(message_type) {
    
  case 'clickedObj' :
    writeData(client, "clickedObj", message_parts);
    others[0].player.instance.send("s.feedback." + message_parts[1]); // used to be message_parts[2]
    target.instance.send("s.feedback." + message_parts[1]); // used to be message_parts[2]
    setTimeout(function() {
      _.map(all, function(p){
        p.player.instance.emit( 'newRoundUpdate', {user: client.userid} );
      });
      gc.newRound();
    }, 3000);
    
    break; 
  
  case 'playerTyping' :
    _.map(others, function(p) {
      p.player.instance.emit( 'playerTyping',
			      {typing: message_parts[1]});
    });
    break;
  
  case 'chatMessage' :
    if(client.game.player_count == 2 && !gc.paused) {
      writeData(client, "message", message_parts);
      // Update others
      var msg = message_parts[1].replace(/~~~/g,'.');
      _.map(all, function(p){
	p.player.instance.emit( 'chatMessage', {user: client.userid, msg: msg});});
    }
    break;

  case 'h' : // Receive message when browser focus shifts
    target.visible = message_parts[1];
    break;
  }
};

function getIntendedTargetName(objects) {
  return _.filter(objects, function(x){
    return x.target_status == 'target';
  })[0]['name']; 
}

function getIntendedTargetOccurrence(objects) {
  return _.filter(objects, function(x){
    return x.target_status == 'target';
  })[0]['occurrence']; 
}

var writeData = function(client, type, message_parts) {
  var gc = client.game;
  var intendedName = getIntendedTargetName(gc.trialInfo.currStim);
  var occurrence = getIntendedTargetOccurrence(gc.trialInfo.currStim);  
  var roundNum = gc.state.roundNum + 1;
  var id = gc.id.slice(0,6);
  switch(type) {
  case "clickedObj" :
    // parse the message
    var clickedName = message_parts[1];
    var correct = intendedName == clickedName ? 1 : 0;
    var objBox = message_parts[2];
    line = [gc.id, Date.now(), roundNum, occurrence, intendedName, clickedName, objBox, correct];
    break;


  case "message" :
    var msg = message_parts[1].replace('~~~','.');
    var timeElapsed = message_parts[2];
    line = [gc.id, Date.now(), roundNum, occurrence, client.role, intendedName, timeElapsed, msg];
    break;
  }
  console.log(type + ":" + line.join(','));
  gc.streams[type].write(line.join(',') + "\n", function (err) {if(err) throw err;});
};







// /* 
//    The following functions should not need to be modified for most purposes
// */

var startGame = function(game, player) {
  // Establish write streams
  var startTime = utils.getLongFormTime();
  var dataFileName = startTime + "_" + game.id + ".csv";
  utils.establishStream(game, "message", dataFileName,
			"gameid,time,roundNum,sender,contents\n");
  utils.establishStream(game, "clickedObj", dataFileName,
			"gameid,time,roundNum,condition," +
			"clickStatus,clickColH,clickColS,clickColL,clickLocS,clickLocL"+
			"alt1Status,alt1ColH,alt1ColS,alt1ColL,alt1LocS,alt1LocL" +
			"alt2Status,alt2ColH,alt2ColS,alt2ColL,alt2LocS,alt2LocL" +
			"targetD1Diff,targetD2Diff,D1D2Diff,outcome\n");
  game.newRound();
};

var setCustomEvents = function(socket) {
  socket.on('stroke', function(data) {
    var others = socket.game.get_others(socket.userid);
    _.map(others, function(p) {                             
      p.player.instance.emit( 'stroke', data);  
    });                                                     
  });
};

module.exports = {
  setCustomEvents : setCustomEvents,
  writeData : writeData,
  startGame : startGame,
  onMessage : onMessage
};
