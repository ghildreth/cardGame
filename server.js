"use strict";

// require('dotenv').config();

const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";
const express = require("express");
const bodyParser = require("body-parser");
const sass = require("node-sass-middleware");
const app = express();

const knexConfig = require("./knexfile");
const knex = require("knex")(knexConfig[ENV]);
// const morgan = require('morgan');
const knexLogger = require('knex-logger');

// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
// app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));


const state = {
  games: {

  }
};

const bots = ['Julius Ceasar', 'Mickey', 'Dave', 'Homer Simpson'];

function drawCard(arrayOfCards) {
  var shuffledCards = shuffleCard(arrayOfCards);
  let prize = shuffledCards.pop();
  return prize;
}

function shuffleCard(arrayOfCards) {
  for (let i = 0; i < arrayOfCards.length - 1; i++) {
    const j = Math.floor(Math.random() * (arrayOfCards.length - 1) + 1);
    [arrayOfCards[i], arrayOfCards[j]] = [arrayOfCards[j], arrayOfCards[i]];
  }
  return arrayOfCards;
}

function getSuitedCards(suit) {
  return ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king' ]
    .map(x=>`${x}_of_${suit.toLowerCase()}`);
}

function getValueOf(card) {
  const value = card.split('_')[0]; //

  // console.log(`getValueOf(${card}) => ${value}`);
  switch(value) {
    case 'ace': return 1;
    case 'jack': return 11;
    case 'queen': return 12;
    case 'king': return 13;
    default: return Number(value);
  }
}


// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

// Home page
app.get("/", (req, res) => {
  res.render("game_homepage");
});

app.get('/games', (req, res) => {
  res.send(state); // entire state of all possible games ever played
});

app.get('/game/:gameId', (req, res) => {
  const gameId = req.params.gameId;
  const game = state.games[gameId];

  if(!game) {
    res.redirect('/');
    return;
  }

  res.render('game_new', { game, gameId });
});

app.post("/game/new", (req, res) => {
  const gameId = new Date().getTime().toString(36);

  const pile = shuffleCard(getSuitedCards('hearts'));

  var valueCard = pile.pop();  // at this point PILE has only 12 cards left!!!
  state.games[gameId] = {
    hand1: getSuitedCards('spades'), // ['ace_of_spades', '', ....]
    hand2: getSuitedCards('diamonds'),
    pile,
    valueCard,
    bet1: null,
    bet2: null,
    score1: 0,
    score2: 0,
    username: req.body.username,
  }

  res.redirect(`/game/${gameId}`);
});


app.post('/game/:gameId/play', (req, res) => {
  const { gameId } = req.params;
  const { card } = req.body; // const card = req.body.card;

  const game = state.games[gameId];

  if(!game) {
    res.redirect('/');
    return;
  }

  const opponentBet = drawCard(game.hand2); // reduces the Bots array of cards by 1 and gives one bet card
  game.hand1 = game.hand1.filter(x=> x != card);
  game.bet1 = opponentBet;
  game.bet2 = card;
  game.winner = "Human";
  if(!game.over){
    if(getValueOf(game.bet1) === getValueOf(game.bet2)) {
      // console.log(`Player 1 wins with ${getValueOf(game.valueCard)} with ${card} vs ${opponentBet}`);
      game.score1 += getValueOf(game.valueCard) / 2;
      game.score2 += getValueOf(game.valueCard) / 2;
    } else if (getValueOf(game.bet1) > getValueOf(game.bet2)){
      // console.log(`Player 2 wins with ${getValueOf(game.valueCard)} with ${opponentBet} vs ${card}`);
      game.score1 += getValueOf(game.valueCard);
    } else if (getValueOf(game.bet2) > getValueOf(game.bet1)) {
      game.score2 += getValueOf(game.valueCard);
    }
    game.valueCard = game.pile.pop();
    game.over = !game.valueCard;
  }
  if (game.score1 > game.score2) {
      game.winner = "Bot";
  }

  // stringify the objecty
  // insert it into DB


var temp = state.games;

var winner;
console.log("temp");
for(var key in temp){
  winner = temp[key].winner;
}


knex('state').insert({
  screen_name: 'rohit',
  gameState: winner
}).returning('id')
.then((id)=>{
  console.log("Record inserted into the database");
   res.redirect(`/game/${gameId}`);
});

})


app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
