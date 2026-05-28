// core.js — MotoBite Shared Core Module
// ============================================
// This file contains ALL functionality shared across all MotoBite apps:
// - Customer (index.html)
// - Admin (admin.html)  
// - Kitchen (kitchen.html)
// - Rider (rider.html)
//
// DO NOT modify without checking all dependent apps.
// Loaded FIRST by all HTML entry points.
// ============================================

// === BASE SHARED CODE ===
// CONFIG
const API = window.location.hostname === 'localhost'
? 'http://localhost:3000'
: 'https://motobite-api.onrender.com'
// SUPABASE AUTH
const SUPA_URL = 'https://cylzuyhdnuvmhfjudsmf.supabase.co'; 
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5bHp1eWhkbnV2bWhmanVkc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzQzNTMsImV4cCI6MjA4ODc1MDM1M30.PlZuSv0TPTvogkcMPdGFsjMugLpAPmq80E3gk_nxNns';
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// GLOBAL STATE
let role = null;
let user = {name:'', phone:''};
let cart = [];
let userLoc = null;
let active0Id = null;
let orderType = 'delivery'; // 'delivery' | 'pickup'
let foodR = 0, riderR = 0;
let riderState = {name:'', phone:'', rating:0, deliveries:0, online:false, regStep:0, regData:{}, activeOrder:null, collected:false, todayTrips:0, todayEarnings:0};
let pinBuf ='';
let oTimer = null;
let kOrders = [];
let kDone = 0;
let chatOrderId = null;
let chatMyRole = null;
let chatMsgs = {};
let chatChannel = null;
let _catObserver = null;
let declinedRiders = new Set();

// Calculate distance between two GPS coordinates in kilometers
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

// DEMO DATA for admin and history fallback
const DEMO_ORDERS_A = [];
const DEMO_RIDERS = [];

// DEMO DATA
const MENU = {

    'Brand New':[
        {id:108,  name:'Butterscotch Krusher',       price:350,  desc:'Chilled Butterscotch Krusher',                       img:'https://glovo.dhmedia.io/image/menus-glovo/products/208a7c15df177d20624c96f3f2f263a70701666b630c687f3292bf0c393dd45a?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1001, name:'Streetwise 9 Butter Chicken', price:1990, desc:'9 pcs Butter Chicken + chips', img:'https://glovo.dhmedia.io/image/menus-glovo/products/8114f8df70a749a6b666bce4d1e146e1a6f45e0026a3eb17a1c97b608fe768cd?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1002, name:'Mega Wing Box Chicken', price:790, desc:'Wings + Butter Chicken combo box',    img:'https://glovo.dhmedia.io/image/menus-glovo/products/e1f6b814dd2d1ee2c1397d014fd32aa3bccd0c030a8cb4159cefe776bd015577?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1003, name:'Dipping Box',      price:1990, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 3 dipping sauces',  img:'https://glovo.dhmedia.io/image/menus-glovo/products/41940fa143d81d7ae2daef32e43b7395dc289902db6458edc5fbf3ad9c2c3fcf?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1004, name:'Dipping Box With 1,25l Soda', price:2200, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 1.25L soda + 3 dipping sauces', img:'https://glovo.dhmedia.io/image/menus-glovo/products/e63722651372325e893d134dfdebb451a2808b70a83110fa138f6a27b1599576?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        
    ],

    Streetwise:[
        {id:11, name:'Streetwise 7',          price:1790,  desc:'7pc OR / SPICY + Family chips + 1.25l soda',            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f7479255-3aab-2264-0729-71591251283d.jpeg?a=6d2ac5f0-7591-fb3e-413f-30e36455129f'},
        {id:9,  name:'Streetwise 5',           price:1200,  desc:'5pcs OR / SPICY + Lrg. chips',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/d332379d-7387-21b8-75e0-e69787140f20.jpeg?a=1f96a8ba-ee8e-3a9a-7734-f217b5e2b673'},
        {id:10, name:'Streetwise 5 Crunch',    price:1150,  desc:'5pcs OR / SPICY + Tortilla chips',                     img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9f60ca25-162c-5872-e514-93615c9430a8.jpeg?a=2875a9d0-f24e-9f95-0c02-05772acc77ff'},
        {id:107, name:'Streetwise 3 Meal',     price:790,   desc:'3 pcs, regular chips, 350ml soda',                     img:'https://glovo.dhmedia.io/image/menus-glovo/products/a957673d32fa6a46ef8c56f83c28f2eca8dd37196c6af960f3466fdf2f8a2c94?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:6,  name:'Streetwise 3',           price:690,   desc:'3pcs OR / SPICY + Reg. fries',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/1185e73b-10f6-f5d6-a3ad-564ce2dc0c09.jpeg?a=a55ab509-2f77-bffb-5bc1-69e8381b26ea'},
        {id:7,  name:'Streetwise 3 with Rice', price:690,   desc:'3pcs OR / SPICY + Colonel Rice',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9ba70c82-600c-68f5-96bd-5ad7f6a784d2.jpeg?a=8cbc68dc-2d6e-8089-0b7a-ecbfd636dd97'},
        {id:8,  name:'Streetwise 3 Crunch',    price:650,   desc:'3 pcs Original Recipe + Tortilla chips',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/3acb77db-7590-9f73-63cd-5474b569c4d2.jpeg?a=0f0aab3c-3ce6-63cb-3b88-24f51b1b6b84'},
        {id:4,  name:'Streetwise 2 Large',     price:590,   desc:'2pcs OR / SPICY + Lrg. fries',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/37fd6de8-12ad-4016-ab2e-ef3e491f4ee8.jpeg?a=2f70c603-e474-d115-c163-cf23286fc21b'},
        {id:106, name:'Streetwise 2 Meal',     price:590,   desc:'2 pcs, regular chips and 350ml soda',                  img:'https://glovo.dhmedia.io/image/menus-glovo/products/0d2663b6946a51471ff5433aa4d04241ff61d96be5e090351985c24c04c6f03e?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:3,  name:'Streetwise 2',           price:490,   desc:'2pcs OR / SPICY + Colonel Rice or Reg. fries',         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/37fd6de8-12ad-4016-ab2e-ef3e491f4ee8.jpeg?a=2f70c603-e474-d115-c163-cf23286fc21b'},
        {id:5,  name:'Streetwise 2 Crunch',    price:450,   desc:'2pcs OR / SPICY + Tortilla chips',                     img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9f60ca25-162c-5872-e514-93615c9430a8.jpeg?a=2875a9d0-f24e-9f95-0c02-05772acc77ff'},
        {id:1,  name:'Streetwise 1',           price:390,   desc:'1pc OR / SPICY + Reg chips',                           img:'https://glovo.dhmedia.io/image/menus-glovo/products/635c67095267875bcc69f291c4f6260a710263bf6e12462212b1b9916605534a?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:2,  name:'Streetwise 1 with Rice', price:390,   desc:'1 pc Original Recipe + Colonel rice',                  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/a9e87805-6236-e07a-6121-ed1485c09cf1.jpeg?a=52c9137d-05ab-0ded-0fff-21c34132e4cb'},
    ],

    Burgers:[
        {id:14, name:'Zinger Burger',           price:650,  desc:'Spicy crispy chicken burger',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/626d220b-717d-2ae1-ad61-952bf4ab693a.jpeg?a=0792b96a-c2b0-8bde-3490-714534582c64'},
        {id:15, name:'Zinger Burger Meal',      price:850,  desc:'Zinger Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/542ce49a-9bfe-0bad-eb6e-4c141d98c397.jpeg?a=0efd49ab-e001-a8cf-94b1-f5b55b4686b0'},
        {id:16, name:'Crunch Burger',           price:470,   desc:'OR / Spicy Crunch chicken burger', img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/626d220b-717d-2ae1-ad61-952bf4ab693a.jpeg?a=0792b96a-c2b0-8bde-3490-714534582c64'},
        {id:17, name:'Crunch Burger Meal',      price:650,    desc:'Crunch Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0226c397-2a2a-2348-bdc6-9f8c6ad1bfd8.jpeg?a=9511d03b-b6f7-ea96-624b-dbaf285b601f'},
        {id:18, name:'Colonel Burger',          price:650,    desc:'Classic Colonel chicken burger',    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e9d5c40f-2fb2-f327-a6fc-f599576167fb.jpeg?a=df731449-20fc-230e-9524-61c570acea1d'},
        {id:19, name:'Colonel Burger Meal',     price:850,    desc:'Colonel Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/542ce49a-9bfe-0bad-eb6e-4c141d98c397.jpeg?a=0efd49ab-e001-a8cf-94b1-f5b55b4686b0'},
        {id:20, name:'Double Crunch Burger',    price:690,     desc:'Double layer crunch chicken burger',   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/ca17b332-80a0-f415-9976-6d53be38b216.jpeg?a=50b79314-56ee-0bb4-9637-5a85ec63bb8c'},
        {id:21, name:'Double Crunch Burger Meal',   price: 890, desc:'Double Crunch Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f8c32194-96f3-49eb-437e-9d33377ee598.jpeg?a=cd6686fe-a21d-9350-64cd-1df38670a232'},
        {id:22, name:'Legend Burger',               price:690,  desc:'The legendary KFC burger',    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/3b55a114-a25a-7a06-1b96-60d6002af506.jpeg?a=fdf9f88f-d102-f38a-d750-0e6bbf039073'},
        {id:23, name:'Legend Burger Meal',     price:890,     desc:'Legend Burger + Reg. chips + 500ml soda', img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/7fde61eb-f8c2-371e-ed06-faa9f0f0bf37.jpeg?a=ec46ad65-c649-c487-5cb2-1bf15e90415c'},
        {id:24, name:'Nyama Nyama Burger', price:850, desc:'Nyama Nyama chicken burger',                    img:'https://tb-static.uber.com/prod/image-proc/processed_images/025b2698ae156722423a263312ee211b/a19bb09692310dfd41e49a96c424b3a6.jpeg'},
        {id:25, name:'Nyama Nyama Burger Meal', price:1100,   desc:'Nyama Nyama Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/147575e3-fedf-1acd-cda9-b0ef8f608a78.jpeg?a=3d44471c-8e0c-6ca1-31fe-1918e2f1b623'},
        {id:26, name:'Hash Brown Burger',      price:390,     desc:'Vegeterian burger with hashbrown',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/441206d2-05ed-e644-fa66-29c268f4793a.jpeg?a=32d252ba-0fe9-5de6-2e65-bba24d9528c0'},
        {id:27, name:'Hash Brown Burger Meal',       price:590,  desc:'Hash Brown Burger + Reg. chips + 500ml soda',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/7bd3de7c-781b-6b97-40e9-98b4e6a903c2.jpeg?a=16c5dd64-0087-69f1-9149-633aaadb2923'},
        {id:28, name:'Crunch Burger Lunchbox',       price:850,  desc:'Crunch Burger + chips + coleslaw + 350ml drink',       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0fe58244-9f6f-3e30-76a2-16f52b4e24aa.jpeg?a=aeaf8c49-2900-5bac-a056-05a9c410b52e'},
    ],

    Wraps:[
        {id:29, name:'Box Master',                   price:690,  desc:'Chicken + chips + soda in a signature box',             img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9d97dab9-3597-ced7-895f-b2a491b1d8a8.jpeg?a=e57a07e7-c0a2-afd4-ec76-eb525cd3eb4d'},
        {id:30, name:'Crunch Master Meal',           price:890,  desc:'Crunch Master + Reg. chips + 500ml soda',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/ff816840-9024-bd91-3903-d31dc9a0fe3a.jpeg?a=67932bbb-b46d-f883-f882-4650d6d5f9df'},
        {id:31, name:'Chicken Lunchbox',             price:850,  desc:'2 pcs chicken + chips + coleslaw + 350ml drink',       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/150e5314-840f-972f-7f5c-ad792e2b3bae.jpeg?a=4b88e727-8054-d93e-8e1a-2004fd44763c'},
        {id:32, name:'Zinger Twister Meal',          price:890,  desc:'Zinger Twister wrap + Reg. chips + 500ml soda',         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/4b484718-22de-e1dc-1d38-8acfa245e6bb.jpeg?a=964f4874-703e-eb74-7dc4-d8ed54c59643'},
        {id:33, name:'Rice Wrap',                    price:290,  desc:'Chicken wrapped with seasoned rice',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/8e8fcd18-1ca0-bb92-fb58-88c2a35dba8d.jpeg?a=5e75bf3e-1606-5fd9-a78b-42203d2a1e33'},
        {id:34, name:'Nuggets Rice Wrap',            price:290,  desc:'Nuggets wrapped with seasoned rice',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/bf231566-8a72-222f-b3eb-1eacb1af8750.jpeg?a=f78eb395-33d0-a264-77aa-9d3e3e0fa9e4'},
        {id:35, name:'Wrapstar',                     price:350,  desc:'Crispy chicken in a soft tortilla wrap',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/c9a9d1fb-4cfe-1d78-2133-d6358565fa9b.jpeg?a=91719fca-f854-802f-9a43-7760f6710812'},
    ],

    Wings:[
         {id:37, name:'Zinger Wings 4 pc',            price:490,  desc:'4 pcs spicy Zinger wings',                            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f70d022b-ba80-5169-9262-f9fa98598a00.jpeg?a=d90e2db2-b7b4-c670-8137-c8831d186ae7'},
         {id:38, name:'Zinger Wings 8 pc',            price:850,  desc:'8 pcs spicy Zinger wings',                            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f70d022b-ba80-5169-9262-f9fa98598a00.jpeg?a=d90e2db2-b7b4-c670-8137-c8831d186ae7'},
         {id:39, name:'Zinger Wings 12 pc',           price:1200, desc:'12 pcs spicy Zinger wings',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f70d022b-ba80-5169-9262-f9fa98598a00.jpeg?a=d90e2db2-b7b4-c670-8137-c8831d186ae7'},
         {id:40, name:'Sticky Wings 4 pc',            price:550,  desc:'4 pcs sweet sticky wings',                            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/2f050cc5-78ed-2c08-f88c-20893adad2bf.jpeg?a=cfe88558-8b7d-7d9f-6fa2-9894813b3617'},
         {id:41, name:'Sticky Wings 8 pc',            price:890,  desc:'8 pcs sweet sticky wings',                            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/6bea1fd1-f3d6-53e1-593e-4342229637c7.jpeg?a=b4bcfe80-5e8d-be8b-9523-534b924bf7cc'},
         {id:42, name:'Sticky Wings 12 pc',           price:1290, desc:'12 pcs sweet sticky wings',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/6f24ec42-a0b4-8f54-dcac-253000641726.jpeg?a=4d6b1120-c945-260d-d441-03383e8440e8'},
         {id:43, name:'Wingman',                      price:700,  desc:'5 Zinger wings + Reg. chips + 350ml drink',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/6a77a2f9-a52f-3659-3407-7c0da302fcd2.jpeg?a=42fe54a4-3eeb-421c-33bc-dcec8d734c64'},
         {id:44, name:'Wingman Sticky',               price:790,  desc:'5 Sticky wings + Reg. chips + 350ml drink',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e74b4413-f1ba-0e50-ace6-a3c050d8ab1a.jpeg?a=1fbb9c66-ee30-a9d8-afd1-2ae910045660'},
         {id:45, name:'Wings Lunchbox',               price:850,  desc:'5 Zinger wings + chips + coleslaw + 350ml drink',      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/3fe7e7b1-c1b6-9d2e-475b-5320062ca22f.jpeg?a=9ada9101-f598-6fbe-a167-958f9e1b6db9'},
    ],

    Sharing:[
        {id:46, name:'9 PC Bucket',                  price:1900, desc:'9 pcs OR / Spicy chicken',                        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/7eba656f-6b3d-19e9-3c7d-23991f936728.jpeg?a=11207093-d788-7551-0368-63e1ff13a33b'},
        {id:47, name:'12 PC Bucket',                 price:2450, desc:'12 pcs OR / Spicy chicken',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0d34e7c2-7f21-ba83-b470-352d3a852314.jpeg?a=b176cf02-4e09-a1c2-fb52-790ee52e9f9b'},
        {id:48, name:'15 PC Bucket',                 price:2900, desc:'15 pcs OR / Spicy chicken',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/2d8437bb-17d5-2b80-60a7-3d7b087d8836.jpeg?a=4dcdb9b8-9127-401b-14f6-d0c1f9b52629'},
        {id:49, name:'18 PC Bucket',                 price:3250, desc:'18 pcs OR / Spicy chicken',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/2800a15b-ceb1-be1a-dde2-25b3454ec884.jpeg?a=7c6a5980-76a9-7ee6-3718-7391afd96f60'},
        {id:50, name:'21 PC Bucket',                 price:3800, desc:'21 pcs OR / Spicy chicken',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/ae097312-5f48-beaa-72e7-c2e448709e53.jpeg?a=912a829a-1fc8-0907-9a36-21478747b18f'},
        {id:51, name:'Kentucky Bucket',              price:2550, desc:'11 pcs OR / Spicy + Family size chips',        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/eb1ab60c-11f5-0f35-2113-5fcc001b99be.jpeg?a=22a49b49-74aa-c02d-5b34-cf73b1d3e6b7'},
        {id:52, name:'Colonel Bucket Feast',         price:2990, desc:'8 pcs + 2 Lrg chips + coleslaw + 2L drink + 4 wings',img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/30925bca-5906-8944-5a78-2e1435091278.jpeg?a=45c840c6-b8e5-e1d6-72d5-15f4218ff938'},
        {id:53, name:'Bawa Bucket',                  price:2200, desc:'16 Zinger Wings + Family chips + 1.25L drink',        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/915e92bb-87d2-b564-a7d9-87909b17c2bc.jpeg?a=e4ced277-2bd5-f74a-47cd-d84288174780'},
        {id:54, name:'Sticky Bawa Bucket',           price:2500, desc:'16 Sticky Wings + Family chips + 1.25L drink',        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/80d5f1d5-e458-e782-f273-cfddce9ccce8.jpeg?a=7f8316a0-2484-dacb-993b-1c41ec9e112d'},      
    ],

    'Nuggets & Pops':[
        {id:55, name:'Chicken Bites 8 pc',           price:390,  desc:'8 pcs tender chicken bites',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/b8ba0758-d52e-5a43-a7b7-57972462e1cf.jpeg?a=32f853eb-1103-77a3-519c-f4c3de4ff166'},
        {id:56, name:'Chicken Bites 16 pc',          price:600,  desc:'16 pcs tender chicken bites',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/1bdbeeb8-6315-1ba0-fd86-d4081130aa0e.jpeg?a=18500b4c-5686-ccc1-1c1f-9d1f23fb338c'},
        {id:57, name:'Chicken Bites 24 pc',          price:790,  desc:'24 pcs tender chicken bites',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0a81ad4b-23d7-4183-d0fd-62926ec0ef45.jpeg?a=5737b088-096c-0bd2-0467-4f8f524261f7'},
        {id:58, name:'KFC Nuggets 8 pc',             price:390,  desc:'8 pcs crispy chicken nuggets',                        img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/8b7a145a-07a1-ece6-1bba-a2b732a039a9.jpeg?a=8c6e8f99-2abd-a597-ba76-956e34306aca'},
        {id:59, name:'KFC Nuggets 16 pc',            price:690,  desc:'16 pcs crispy chicken nuggets',                       img:'https://cdn.tictuk.com/059c6a06-ad71-1fee-63b6-c78d1dabb058/8e79856a-04d8-6838-e042-acbf70108e7d.jpeg?a=9455943f-a868-0b88-194b-49c5ea980812'},
        {id:60, name:'KFC Nuggets 24 pc',            price:890,  desc:'24 pcs crispy chicken nuggets',                       img:'https://cdn.tictuk.com/059c6a06-ad71-1fee-63b6-c78d1dabb058/2c2450ca-3bb2-c4fb-eb26-dbb6968aee4f.jpeg?a=c712c1c3-5ba6-92fa-44cf-ffda8c9ad5d6'},
        {id:61, name:'Pops Regular',                 price:390,  desc:'Regular pops chicken',                             img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/36857b07-5970-0610-a41f-1102ac773dcc.jpeg?a=2c136b25-7f9f-7876-b275-b8738523af05'},
        {id:62, name:'Pops Large',                   price:690,  desc:'Large pops chicken',                               img:'https://cdn.tictuk.com/059c6a06-ad71-1fee-63b6-c78d1dabb058/ce800dca-2e6a-0406-6390-f8c36845e986.jpeg?a=1cf94994-4520-bb51-8592-1b80afd74a3d'},
    ],

    'Chicken Pieces':[
        {id:66,  name:'1 Piece Chicken',  price:290,   desc:'1 pc Original Recipe chicken',      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/b39c8366-4b64-1efe-a197-3971fec1e7a0.jpeg?a=bc67e266-237e-54cc-4c95-f096e62121a7'},
        {id:109, name:'5 Piece Chicken',  price:1150,  desc:'5 pcs Original Recipe chicken',     img:'https://tb-static.uber.com/prod/image-proc/processed_images/6ce81e0f8f2152707ba6dbca3ceef101/c67fc65e9b4e16a553eb7574fba090f1.jpeg'},
        {id:110, name:'7 Piece Chicken',  price:1500,  desc:'7 pcs Original Recipe chicken',     img:'https://tb-static.uber.com/prod/image-proc/processed_images/2fcd6b470fe4b7cf2291331326ca0320/a19bb09692310dfd41e49a96c424b3a6.jpeg'},
    ],

    'Snacks & Sides':[
        {id:63, name:'3 Crispy Fillets',             price:490,  desc:'3 crispy chicken fillets + 1 dip',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0be83174-5ee6-7047-05f2-8d253e3a9b2b.jpeg?a=f0d9993f-f043-34a4-eb7f-ea2ab9f69d63'},
        {id:64, name:'6 Crispy Fillets',             price:890,  desc:'6 crispy chicken fillets',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/2c198a58-d809-9673-cb4c-ecb01bbb2c6c.jpeg?a=cd8243fc-7de8-21f0-5f74-bf77f9c00783'},
        {id:65, name:'Crispy Strips Meal',           price:790,  desc:'3 Crispy Strips + Dip + Reg. chips + 500ml drink',  img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/ad75c67d-1323-6d29-569f-d55a2c5f9dbb.jpeg?a=282ddf1d-443f-b864-de8f-f5e6a8c8ad04'},
        {id:67, name:'Regular Chips',                price:290,  desc:'Regular crispy KFC chips',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/4aa1f88d-0e1b-f7d0-424b-94400802bf87.jpeg?a=bc67e266-237e-54cc-4c95-f096e62121a7'},
        {id:68, name:'Large Chips',                  price:290,  desc:'Large portion crispy chips',                         img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/4f7f0a4a-4159-7c62-35f6-1b2220b6167b.jpeg?a=c1974a1a-10e6-e981-ab6c-79ceb536ade5'},
        {id:69, name:'Family Chips',                 price:590,  desc:'Family size crispy chips',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0838ced2-9f6c-1380-bc7e-b73894eb68dd.jpeg?a=bbffd18d-2738-770b-4b5c-d56f10b6dcf3'},
        {id:70, name:'Tortilla Chips',               price:200,  desc:'Crispy tortilla chips',                              img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/8d98c408-c8c9-f638-a149-5e131f329d53.jpeg?a=d4134b36-309a-2420-5f3e-92ac1a4ae23c'},
        {id:71, name:'Colonel Rice',                 price:250,  desc:'Seasoned yellow rice',                               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9c84250c-232f-6967-aaa8-21b9eb95192d.jpeg?a=8c8b2051-84ef-c2e0-0110-fb8b324d2944'},
        {id:72, name:'Coleslaw Small',               price:100,  desc:'Small creamy KFC coleslaw',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b'},
        {id:73, name:'Coleslaw Regular',             price:270,  desc:'Regular creamy KFC coleslaw',                        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b'},
        {id:74, name:'Coleslaw Large',               price:350,  desc:'Large creamy KFC coleslaw',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b'},
    ],

    Drinks:[
        {id:75, name:'Soda 350ml',                   price:100,  desc:'Coca-Cola, Sprite or Fanta — chilled',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e36d00da-ec9f-9d47-3cb5-65c99b37b11f.jpeg?a=6c6073df-0046-1b57-4098-bbbb3e58c1c7'},
        {id:76, name:'Soda 500ml',                   price:150,  desc:'Coca-Cola, Sprite or Fanta — chilled',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/17b775dd-887a-101c-0990-0c727defba6d.jpeg?a=42c02d15-a895-5cb6-8c55-127f74702b7f'},
        {id:77, name:'Soda 1.25L',                   price:330,  desc:'Large Coca-Cola, Sprite or Fanta',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/00328365-9624-5ec6-00ce-a5f2bf8fa8b4.jpeg?a=d26d865e-2a6d-43c2-98df-08e1fc69c947'},
        {id:78, name:'Soda 2L',                      price:370,  desc:'2 Litre Coca-Cola, Sprite or Fanta',                 img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0486bf0b-d0be-ab04-4ece-605420df9b8e.jpeg?a=66f7c23a-c889-a313-b828-e226f2b47967'},
        {id:79, name:'Dasani Water 500ml',           price:130,  desc:'Chilled bottled water',                              img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f4989775-138d-304d-39ca-1ebf00397f73.jpeg?a=173ef253-0bac-c302-dc97-1714bdf92897'},
        {id:80, name:'Minute Maid Mango 400ml',      price:160,  desc:'Chilled Minute Maid Mango juice',                    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/d1a6c468-ef0f-4ef3-721f-ecb5bc447a2b.jpeg?a=fe6f7046-539d-804b-19da-41c0e22d97c2'},
        {id:81, name:'Minute Maid Apple 400ml',      price:160,  desc:'Chilled Minute Maid Apple juice',                    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/269397a7-49d0-519a-3ccb-53a69b4974bd.jpeg?a=ddbd42dc-a33b-18d6-9684-76d6c0d27cbd'},
        {id:82, name:'Minute Maid Tropical 400ml',   price:160,  desc:'Chilled Minute Maid Tropical juice',                 img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/dc7c4b48-a9a9-0dde-5fc6-5c24cd696be0.jpeg?a=37511ffe-071e-2b2c-90a1-83337a81a375'},
        {id:83, name:'Minute Maid Orange 400ml',     price:160,  desc:'Chilled Minute Maid Orange juice',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/c67d64f7-1b7f-877e-e911-dc33d788e141.jpeg?a=ca1ed84f-be8c-5fa3-56f1-1969d5b74072'},
    ],

    Krushers:[
        {id:84, name:'Oreo Krusher',                 price:350,  desc:'Creamy Oreo blended Krusher',                        img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/7b65b2b0-8eb4-cd7a-15c3-87c08faeb8d0.jpeg?a=1d7b3d7b-8e12-7d7f-755e-77b7879cce4e'},
        {id:85, name:'Strawberry Krusher',           price:350,  desc:'Chilled Strawberry Krusher',                         img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/7406d631-2daa-a108-354e-8c3aa87d1c23.jpeg?a=5c37924d-1065-37b0-550b-339eac5de50b'},
        {id:86, name:'Cheese Cake Krusher',          price:350,  desc:'Creamy Cheese Cake Krusher',                         img:'https://glovo.dhmedia.io/image/menus-glovo/products/ec4ae52effafbe596592bc3d23a662c14ffb80cb7d02ae500a8b71d6d2aa232f?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:87, name:'Mixed Berry Krusher',          price:350,  desc:'Chilled Mixed Berry Krusher',                        img:'https://glovo.dhmedia.io/image/menus-glovo/products/235b301cf75c6c3ddb52c7e3312fc6400d313bbd6a85d8e6df6cd00bb3559431?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:88, name:'Blueberry Krusher',            price:350,  desc:'Chilled Blueberry Krusher',                          img:'https://glovo.dhmedia.io/image/menus-glovo/products/91cfe59a723117f36de6c99a3802ef704acdfa23b922a3aa043393c786203a10?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:108,  name:'Butterscotch Krusher',       price:350,  desc:'Chilled Butterscotch Krusher',                       img:'https://glovo.dhmedia.io/image/menus-glovo/products/208a7c15df177d20624c96f3f2f263a70701666b630c687f3292bf0c393dd45a?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='}
  ],

  Desserts:[
        {id:89,  name:'Ice Lolly Passion',                 price:60,   desc:'Passion fruit flavoured ice lolly',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/69bdacd9-339f-4c28-44b7-e0b0e9bb8915.jpeg?a=911d0f50-5ebe-c7d9-b4e5-f8de9a302e0f'},
        {id:90,  name:'Ice Lolly',                         price:60,   desc:'Classic Pina Colada ice lolly',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/29eda04c-1d85-8430-084d-2763bd718cbe.jpeg?a=b52dc288-b370-971f-de9d-dcfbf2a5e517'},
        {id:91,  name:'Soft Twirl',                        price:150,  desc:'Classic soft serve ice cream cone',               img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/619a8350-0b6c-a65e-a4ef-8153cba68cb4.jpeg?a=d34bcf34-6fbb-89f3-e541-7a9fd542859d'},
        {id:92,  name:'Salted Caramel Ice Cream 250ml',    price:290,  desc:'Salted caramel ice cream tub 250ml',              img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e5637453-0c27-815f-ef7e-c0df4a883bd8.jpeg?a=451513c7-a1fa-c8f5-0e2b-b3bbb0dbc641'},
        {id:93,  name:'Cookies & Cream Ice Cream 250ml',   price:290,  desc:'Cookies & cream ice cream tub 250ml',             img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e67a13c4-1c93-0217-5b1a-2d898196a289.jpeg?a=b68cee09-2aee-9fa4-9aa2-1a917fad5ab8'},
        {id:94,  name:'Vanilla Choc Chip Ice Cream 250ml', price:290,  desc:'Vanilla choc chip ice cream tub 250ml',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/dc708884-71fe-acf4-6edb-d94095f84b56.jpeg?a=faf1a63b-5e2e-3616-1fa3-5c3f3a0efd35'},
        {id:95,  name:'Salted Caramel Ice Cream 750ml',    price:550,  desc:'Salted caramel ice cream tub 750ml',              img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/c7d6c548-e25b-17c0-ad0d-d1e1c75ce60a.jpeg?a=3711e346-d282-c6f0-9c63-82bdc4ae1787'},
        {id:96,  name:'Cookies & Cream Ice Cream 750ml',   price:550,  desc:'Cookies & cream ice cream tub 750ml',             img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/ac84ebd3-6b06-22be-07c3-fcac6fd29bd3.jpeg?a=322ecaf5-b2db-25ce-5f3a-b1f652429068'},
        {id:97,  name:'Vanilla Choc Chip Ice Cream 750ml', price:550,  desc:'Vanilla choc chip ice cream tub 750ml',           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/c891af60-40ef-02cd-3cc6-01e37b04ab5a.jpeg?a=1e8c6be5-5725-629e-0d3c-41eb276af531'},
  ],
  
  'Kiddie Meals':[
        {id:98,  name:'Kiddie Meal 1',  price:490,  desc:'6 Nuggets + Reg. chips + 350ml soda',      img:'https://glovo.dhmedia.io/image/menus-glovo/products/95395b9c31f3cf0e63a4a5cf5830eccc55fd46485612fb1aaf397636d815c7a1?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:99,  name:'Kiddie Meal 2',  price:450,  desc:'1 pc Chicken + Reg. chips + 350ml soda',   img:'https://tb-static.uber.com/prod/image-proc/processed_images/63ff38faeb4d588210ebaa5b6fcb23fb/0fb376d1da56c05644450062d25c5c84.jpeg'},
        {id:100, name:'Kiddie Meal 3',  price:550,  desc:'20 Pops + Reg. chips + 350ml soda',        img:'https://glovo.dhmedia.io/image/menus-glovo/products/73ff0591c9e74c1d6ff2e8f44ee9cd8fa70d9bcf7d4aa8136c224579f23e8a11?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
  ]

};

function ago(mins){ return new Date(Date.now()-mins*60000).toISOString();}

//API HELPER
async function apiFetch(path, opts={}) {
  // Get Supabase token from localStorage — only present for admin sessions
  const supaToken = localStorage.getItem('sb-cylzuyhdnuvmhfjudsmf-auth-token');
  let token = '';
  try {
    token = supaToken ? JSON.parse(supaToken).access_token : '';
  } catch {}

  // Only send Authorization header when a real token exists.
  // Customers and riders have no Supabase session so token is '' —
  // sending 'Bearer ' (empty) is wasteful and confusing in server logs.
  const authHeaders = token ? { 'Authorization': 'Bearer ' + token } : {};

  try {
    const r = await fetch(API+path, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-phone': user.phone,
        ...authHeaders,
        ...(opts.headers||{})
      },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if(!r.ok) throw new Error(r.status);
    return r.json();
  } catch { return null; }
}

// Inject chat-banner slide animation once
(function(){
  if(document.getElementById('mb-anim-style')) return;
  const st = document.createElement('style');
  st.id = 'mb-anim-style';
  st.textContent = `
    @keyframes slideDown {
      from { transform: translateY(-100%); opacity:0; }
      to   { transform: translateY(0);     opacity:1; }
    }
  `;
  document.head.appendChild(st);
})();

// TOAST
function toast(msg, type='', ms=3000){
    const c=document.getElementById('toasts');
    const el=document.createElement('aside');
    el.className=`toast${type?' '+type:''}`;
    el.textContent=msg;
    c.appendChild(el);
    setTimeout(() => { el.style.animation='tout .3s ease forwards'; setTimeout(()=>el.remove(),300); }, ms);
}

// Enter key function

function enableEnterKey(btnId){
    setTimeout(()=>{
        document.querySelectorAll('#af input').forEach(inp => {
            inp.addEventListener('keydown', e => {
                if(e.key === 'Enter' && inp.value.trim().length > 0){ 
                  e.preventDefault();
                  document.getElementById(btnId)?.click();
                }
            });
        });
    }, 300);
}

// FORMATTERS

const F = {
  money:  a => `KES ${Number(a).toLocaleString()}`,

  date:   d => new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }),

  phone:  p => {
    const l = p.startsWith('254') ? '0' + p.slice(3) : p;
    return l.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  },

  norm:   p => {
    const d = p.replace(/\D/g, '');
    return d.startsWith('254') ? `+${d}`
         : d.startsWith('0')   ? `+254${d.slice(1)}`
         :                       `+254${d}`;
  },

  age:    d => {
    const m = Math.floor((Date.now() - new Date(d)) / 60000);
    return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
  },

  status: (s, orderType) => {
    // ✅ Pickup — no rider steps, uses collection language
    if (orderType === 'pickup') {
      return {
        pending:  'AWAITING PAYMENT',
        paid:     'PAYMENT CONFIRMED',
        cooking:  'BEING PREPARED',
        ready:    'READY FOR PICKUP!',
        picked_up:'COLLECTED ✓',      // ✅ safe fallback
        delivered:'COLLECTED ✓',
      }[s] || s.toUpperCase();
    }

    // ✅ Delivery — full rider flow
    return {
      pending:        'AWAITING PAYMENT',
      paid:           'PAYMENT CONFIRMED',
      cooking:        'BEING PREPARED',
      ready:          'READY FOR DELIVERY!',
      rider_assigned: 'RIDER ASSIGNED',
      picked_up:      'OUT FOR DELIVERY',
      delivered:      'DELIVERED ✓',
    }[s] || s.toUpperCase();
  },

  badge: s => ({
    pending:        'b-muted',
    paid:           'b-blue',
    cooking:        'b-orange',
    ready:          'b-green',   // ✅ green — food is ready
    rider_assigned: 'b-blue',
    picked_up:      'b-blue',
    delivered:      'b-green',
  })[s] || 'b-muted',

  emoji: c => ({
    'Brand New':      '🔥',
    'Streetwise':     '🍗',
    'Chicken Pieces': '🍗',
    'Burgers':        '🍔',
    'Wraps':          '🌯',
    'Sharing':        '🍗🍗',
    'Wings':          '🍖',
    'Snacks & Sides': '🍟',
    'Drinks':         '🥤',
    'Krushers':       '🥤',
    'Desserts':       '🍦',
    'Kiddie Meals':   '🧒',
  })[c] || '🍽️',
};

function screen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
}

// LANDING & AUTH
function selectRole(r){
    role=r;
    const cfg={
    customer:{ icon:'🍗',title:'CUSTOMER',sub:'Enter your name and phone to start ordering.', fields:'name+phone'},
    rider:   { icon:'🏍️',title:'RIDER',   sub:'Enter your phone to access your rider dashboard.', fields:'phone'},
    kitchen: { icon:'👨‍🍳',title:'KITCHEN', sub:'Enter the kitchen passcode to view the order board.', fields:'code'},
    admin:   { icon:'⚙️', title:'ADMIN',   sub:'Enter your admin passcode to access the dashboard.', fields:'code'}, 
    }[r];
    // Rider — show Sign In / Register options
    if(r === 'rider'){
        document.getElementById('ai').textContent=cfg.icon;
        document.getElementById('at').textContent='RIDER';
        document.getElementById('as').textContent='Sign in or create a new rider account';
        document.getElementById('af').innerHTML=`
          <div class="auth-options">
            <button class="btn btn-primary btn-full btn-lg" onclick="showRiderSignIn()">Sign In</button>
            <button class="btn btn-ghost btn-full" style="margin-top:12px;background:var(--dark2);border:2px solid var(--line2)" onclick="showRiderRegister()">New Rider — Register</button>
          </div>`;
        screen('s-auth');
        const contBtn = document.getElementById('auth-btn');
        if(contBtn) contBtn.style.display = 'none';
        return;
    }
    // Kitchen, Admin - go directly to auth
    if(r === 'kitchen' || r === 'admin'){
        document.getElementById('ai').textContent=cfg.icon;
        document.getElementById('at').textContent=cfg.title;
        document.getElementById('as').textContent=cfg.sub;
        document.getElementById('af').innerHTML=buildFields(cfg.fields);
        screen('s-auth');
        setTimeout(()=>document.querySelector('#af input')?.focus(),100);
        enableEnterKey('auth-btn');
        return;
    }
     // CUSTOMER - show Sign In / Register options
 if(r === 'customer'){
   document.getElementById('ai').textContent=cfg.icon;
   document.getElementById('at').textContent='WELCOME';
   document.getElementById('as').textContent='Sign in to your account or create a new one';
   document.getElementById('af').innerHTML=`
     <div class="auth-options">
       <button class="btn btn-primary btn-full btn-lg" onclick="showCustomerLogin()">Sign In</button>
       <button class="btn btn-ghost btn-full" style="margin-top:12px; background:var(--dark2); border:2px solid var(--line2" onclick="showCustomerRegister()">Create Account</button>
     </div>
   `;
   screen('s-auth');
   // Hide the Continue button on this screen
  const contBtn = document.getElementById('auth-btn');
  if(contBtn) contBtn.style.display = 'none';
   enableEnterKey('auth-btn');
   return;
 }
    
    setTimeout(() => {
    const saved = localStorage.getItem('mb_user');
    if(saved){
        try {
            const u = JSON.parse(saved);
            if(role === 'customer'){
                const nameEl = document.getElementById('f-name');
                const phoneEl = document.getElementById('f-phone');
                if(nameEl && u.name) nameEl.value = u.name;
                if(phoneEl && u.phone){
                    const local = u.phone.startsWith('254') ? u.phone.slice(3) : u.phone;
                    phoneEl.value = local;
                }
            } else if(role === 'rider'){
                const phoneEl = document.getElementById('f-phone');
                const savedRider = localStorage.getItem('mb_rider');
                const rPhone = savedRider ? JSON.parse(savedRider).phone : u.phone;
                if(phoneEl && rPhone){
                    const local = rPhone.startsWith('254') ? rPhone.slice(3) : rPhone;
                    phoneEl.value = local;
                }
            }
        } catch{}
    }
    enableEnterKey('auth-btn');
}, 200);
}

function buildFields(type){
    if(type==='name+phone') return `
    <div class="field"><label class="field-lbl">Your Name</label><input class="inp" id="f-name" placeholder="eg. John" autocomplete="name"/></div>
     <div class="field"><label class="field-lbl">Phone Number</label><div class="phone-row"><span class="phone-pre">🇰🇪 +254</span><input class="inp" id="f-phone" placeholder="712 345 678" inputmode="tel"/></div></div>`;
     if(type==='phone') return `
      <div class="field"><label class="field-lbl">Phone Number</label><div class="phone-row"><span class="phone-pre">🇰🇪 +254</span><input class="inp" id="f-phone" placeholder="712 345 678" inputmode="tel"/></div></div>`;
  return `<div class="field"><label class="field-lbl">Passcode</label><input class="inp" id="f-code" type="password" placeholder="Enter passcode" autocomplete="off"/></div>`;
}

// Customer Login
function showCustomerLogin() {
  document.getElementById('at').textContent = 'SIGN IN';
  document.getElementById('as').textContent = 'Enter your phone number to continue';
  document.getElementById('af').innerHTML = `
    <div class="field">
      <label class="field-lbl">Phone Number</label>
      <div style="display:flex;gap:8px">
        <span style="padding:12px;background:var(--dark2);border-radius:8px;color:var(--muted)">+254</span>
        <input class="inp" id="f-phone" placeholder="712345678" inputmode="tel" maxlength="9" style="flex:1"/>
      </div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="loginCustomer()">
      Continue →
    </button>
    <p style="text-align:center;margin-top:16px;font-size:.85rem;color:var(--muted)">
      Don't have an account? 
      <a href="#" onclick="showCustomerRegister(); return false;" style="color:var(--red)">Create Account</a>
    </p>
  `;
  screen('s-auth');
  
  const contBtn = document.getElementById('auth-btn');
  if(contBtn) contBtn.style.display = 'none';
}

async function loginCustomer() {
  const phone = document.getElementById('f-phone')?.value.trim();

  if(!phone || phone.replace(/\D/g,'').length < 9){
    toast('Please enter your phone number','err');
    return;
  }

  const digits = phone.replace(/\D/g,'');
  const fullPhone = digits.startsWith('254') ? `+${digits}` : `+254${digits}`;

  // Look up customer directly — no OTP needed for returning users
  const { data: customer } = await supa
    .from('customers')
    .select('*')
    .eq('phone', fullPhone)
    .maybeSingle();

  if(customer){
    user = { name: customer.name, phone: customer.phone };
    localStorage.setItem('mb_user', JSON.stringify(user));
    toast(`Welcome back, ${customer.name}! 👋`, 'ok');
    launchCustomer();
  } else {
    toast('No account found. Please create one.','err');
    setTimeout(() => showCustomerRegister(), 1500);
  }
}
// Customer Registration
function showCustomerRegister() {
  document.getElementById('at').textContent = 'CREATE ACCOUNT';
  document.getElementById('as').textContent = 'Join MotoBite and start ordering';
  document.getElementById('af').innerHTML = `
    <div class="field">
      <label class="field-lbl">Full Name</label>
      <input class="inp" id="f-name" placeholder="John Doe"/>
    </div>
    <div class="field">
      <label class="field-lbl">Phone Number</label>
      <div style="display:flex;gap:8px">
        <span style="padding:12px;background:var(--dark2);border-radius:8px;color:var(--muted)">+254</span>
        <input class="inp" id="f-phone" placeholder="712345678" inputmode="tel" maxlength="9" style="flex:1"/>
      </div>
    </div>
    <button class="btn btn-primary btn-full" style="margin-top:16px" onclick="registerCustomer()">
      Continue →
    </button>
    <p style="text-align:center;margin-top:16px;font-size:.85rem;color:var(--muted)">
      Already have an account? 
      <a href="#" onclick="showCustomerLogin(); return false;" style="color:var(--red)">Sign In</a>
    </p>
  `;
  screen('s-auth');
  
  const contBtn = document.getElementById('auth-btn');
  if(contBtn) contBtn.style.display = 'none';
}

async function registerCustomer() {
  const name = document.getElementById('f-name')?.value.trim();
  const phone = document.getElementById('f-phone')?.value.trim();

  // Validation
  if(!name || name.length < 2){
    toast('Please enter your full name','err');
    return;
  }

  if(!phone || phone.length < 9){
    toast('Please enter a valid phone number','err');
    return;
  }

// CORRECT — consistent with rest of app
const fullPhone = phone.startsWith('0') 
  ? `+254${phone.slice(1)}` 
  : `+254${phone}`;

  // Save name temporarily
  localStorage.setItem('temp_name', name);

  // Send OTP and verify
  await sendOtpAndVerify(fullPhone, async (verifiedPhone) => {
    // OTP verified - complete registration
    const savedName = localStorage.getItem('temp_name');
    
    const res = await apiFetch('/api/customer/login', {
      method: 'POST',
      body: { phone: verifiedPhone, name: savedName }
    });

    if(res?.success){
      // Save user data using the same mb_user key the rest of the app reads
      user = { name: savedName, phone: verifiedPhone };
      localStorage.setItem('mb_user', JSON.stringify(user));
      localStorage.removeItem('temp_name');

      toast(`Welcome to MotoBite, ${savedName}! 🎉`, 'ok');
      launchCustomer();
    } else {
      toast(res?.error || 'Registration failed','err');
    }
  });
}

// ── RIDER AUTH SCREENS ────────────────────────────────────────────────────────

function showRiderSignIn(){
  // Existing rider — just needs phone to look up their account
  document.getElementById('at').textContent='RIDER SIGN IN';
  document.getElementById('as').textContent='Enter your registered phone number';
  document.getElementById('af').innerHTML=buildFields('phone');
  const contBtn = document.getElementById('auth-btn');
  if(contBtn){ contBtn.style.display='block'; contBtn.textContent='Sign In →'; }

    // ADD — hide back/cancel for rider screens
  document.querySelector('.auth-back')?.style.setProperty('display','none');
  document.querySelector('#s-auth .btn-ghost')?.style.setProperty('display','none');

  setTimeout(()=>document.querySelector('#af input')?.focus(),100);
  enableEnterKey('auth-btn');
  // Mark as sign-in mode so authSubmit knows not to create a new account
  window._riderMode = 'signin';
}

function showRiderRegister(){
  // New rider — needs phone only; name + docs collected after in renderRiderReg()
  document.getElementById('at').textContent='NEW RIDER';
  document.getElementById('as').textContent='Enter your phone number to create an account';
  document.getElementById('af').innerHTML=buildFields('phone');
  const contBtn = document.getElementById('auth-btn');
  if(contBtn){ contBtn.style.display='block'; contBtn.textContent='Register →'; }

    // ADD — hide back/cancel for rider screens
  document.querySelector('.auth-back')?.style.setProperty('display','none');
  document.querySelector('#s-auth .btn-ghost')?.style.setProperty('display','none');

  setTimeout(()=>document.querySelector('#af input')?.focus(),100);
  enableEnterKey('auth-btn');
  window._riderMode = 'register';
}

// ── OTP VERIFICATION ──────────────────────────────────────────────────────────
// Called after phone number is validated — sends OTP and shows the verify screen.
// onSuccess is called once the code is confirmed.

async function sendOtpAndVerify(phone, onSuccess) {
  document.getElementById('at').textContent = 'VERIFY PHONE';
  document.getElementById('as').textContent = `Enter the 6-digit code sent to +254${phone.slice(3)}`;
  document.getElementById('af').innerHTML = `
    <div class="field">
      <label class="field-lbl">Verification Code</label>
      <input class="inp" id="f-otp" placeholder="Enter 6-digit code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"/>
    </div>
    <div style="font-size:.78rem;color:var(--muted);margin-top:6px">
      Didn't receive it? <span style="color:var(--red);cursor:pointer" onclick="resendOtp('${phone}')">Resend</span>
    </div>
  `;
  const contBtn = document.getElementById('auth-btn');
  if(contBtn){ contBtn.style.display='block'; contBtn.textContent='Verify →'; contBtn.disabled=false; contBtn.innerHTML='Verify →'; }

  const res = await apiFetch('/api/auth/send-otp', { method:'POST', body:{ phone } });
  if(!res?.success){
    const errMsg = res?.error || 'Could not send verification code. Try again';
    toast(errMsg,'err');
    return;
  }
  toast('Code sent! Check your SMS 📱','ok');

  window._otpPhone   = phone;
  window._otpSuccess = onSuccess;
  window._otpMode    = true;

  setTimeout(()=>document.getElementById('f-otp')?.focus(), 100);
  enableEnterKey('auth-btn');
}

async function resendOtp(phone){
  const res = await apiFetch('/api/auth/send-otp', { method:'POST', body:{ phone } });
  if(res?.success) toast('New code sent 📱','ok');
  else toast('Could not resend. Try again.','err');
}

async function verifyOtp() {
  const pin = document.getElementById('f-otp')?.value.trim();
  const btn = document.getElementById('auth-btn');
  
  if(!pin || pin.length < 6){ 
    toast('Enter the 6-digit code','err'); 
    return; 
  }

  btn.innerHTML='<span class="spin"></span>'; 
  btn.disabled=true;

  const res = await apiFetch('/api/auth/verify-otp', { 
    method:'POST', 
    body:{ phone: window._otpPhone, pin }  // Backend accepts 'pin'
  });

  btn.innerHTML='Verify →'; 
  btn.disabled=false;

  if(!res?.success){
    toast(res?.error || 'Wrong code — check your SMS and try again','err');
    document.getElementById('f-otp').value='';
    document.getElementById('f-otp').focus();
    return;
  }

  // ✅ OTP verified successfully
  toast('✅ Phone verified!', 'ok');
  
  const cb = window._otpSuccess;
  const verifiedPhone = window._otpPhone;
  
  window._otpPhone   = null;
  window._otpSuccess = null;
  window._otpMode    = false;
  
  cb(verifiedPhone);
}

async function authSubmit() {
    const btn=document.getElementById('auth-btn');

    // If we're in OTP verification mode, route to verifyOtp instead
    if(window._otpMode){ verifyOtp(); return; }

    btn.innerHTML='<span class="spin"></span>'; btn.disabled=true;
    const reset =()=>{ btn.innerHTML='Continue →'; btn.disabled=false; };

   if(role==='customer'){
 const nameInput = document.getElementById('f-name');
 const phoneInput = document.getElementById('f-phone');
 const raw = phoneInput?.value.trim();

 if(!raw||raw.replace(/\D/g,'').length<9){
   toast('Enter a valid phone number','err');
   return reset();
 }

 if(!nameInput){
   const saved = localStorage.getItem('mb_user');
   if(!saved){
     toast('No account found. Tap "Create Account" to sign up.','err');
     return reset();
   }
   try {
     const u = JSON.parse(saved);
     const normalized = F.norm(raw);
     if(u.phone !== normalized){
       toast('Phone number not recognized.','err');
       return reset();
     }
     user = { name: u.name, phone: normalized };
   } catch {
     toast('No account found. Create one first.','err');
     return reset();
   }
 } else {
   const name = nameInput.value.trim();
   if(!name||name.length<2){
     toast('Enter your full name','err');
     return reset();
   }
   user = { name, phone: F.norm(raw) };
 }

 // CORRECT — OTP only for new customers
const isReturning = !!localStorage.getItem('mb_user');

if(isReturning){
  // Existing customer — skip OTP, log straight in
  localStorage.setItem('mb_user', JSON.stringify(user));
  toast(`Welcome back, ${user.name}! 👋`,'ok');
  await apiFetch('/api/customer/login',{method:'POST',body:{phone:user.phone,name:user.name}});
  reset(); launchCustomer();
  return;
}

// New customer — verify phone with OTP first
btn.innerHTML='Continue →'; btn.disabled=false;
sendOtpAndVerify(user.phone, async () => {
  localStorage.setItem('mb_user', JSON.stringify(user));
  toast(`Account created! Welcome, ${user.name}! 🍗`,'ok');
  await apiFetch('/api/customer/login',{method:'POST',body:{phone:user.phone,name:user.name}});
  launchCustomer();
});
return;


}

     else if(role==='rider'){
 const raw=document.getElementById('f-phone')?.value.trim();
        if(!raw||raw.replace(/\D/g,'').length<9){ toast('Enter a valid phone number','err'); return reset(); }
        user.phone = F.norm(raw);

        // ── SIGN IN mode — no OTP needed, just look up their account ──────
        if(window._riderMode === 'signin'){
          const data=await apiFetch('/api/rider/login',{method:'POST',body:{phone:user.phone}});

          if(data?.exists === false || !data){
            toast('No rider account found. Tap "New Rider — Register" to create one.','err',7000);
            reset(); return;
          }
          if(data.status === 'pending'){
            toast('Your application is under review. You will be notified within 24 hours.','warn',8000);
            reset(); screen('s-landing'); return;
          }
          if(data.status === 'suspended'){
            toast('Your account has been suspended. Contact KFC Narok on 0702 923 826.','err',8000);
            reset(); screen('s-landing'); return;
          }
          // Approved rider — restore full state and go to dashboard
          riderState={...riderState,...data,phone:user.phone};
          // Cache key fields so session restore can work offline without a network call
          localStorage.setItem('mb_rider',JSON.stringify({
            phone:user.phone,
            name:data.name,
            rating:data.rating,
            deliveries:data.total_deliveries,
            status:data.status,
            online:false
           }));
          toast(`Welcome back, ${data.name}! 🏍️`,'ok');
          reset(); launchRider();
          return;
        }

        // ── REGISTER mode — send OTP to verify phone first ────────────────
        btn.innerHTML='Continue →'; btn.disabled=false;

        sendOtpAndVerify(user.phone, async () => {
          const data=await apiFetch('/api/rider/login',{method:'POST',body:{phone:user.phone}});

          if(data && data.status){
            // Phone already has an account — redirect to sign in
            toast('This number already has a rider account. Please Sign In instead.','warn',6000);
            showRiderSignIn();
            return;
          }
          // No account yet — go to registration steps
          riderState.phone = user.phone;
          localStorage.setItem('mb_rider', JSON.stringify({phone:user.phone}));
          toast('Phone verified! Complete your registration 🏍️','ok');
          launchRider(); // launchRider checks !riderState.name → renderRiderReg
        });
        return;

  } else if(role==='kitchen'){
    const code=document.getElementById('f-code')?.value.trim();
    if(!code){ toast('Enter the kitchen passcode','err'); return reset(); }
    const r=await apiFetch('/api/kitchen/verify',{method:'POST',body:{code}});
    if(!r?.ok){ toast('Wrong passcode — ask your manager','err'); return reset(); }
    localStorage.setItem('mb_kitchen','1');
    reset(); launchKitchen();

  } else if(role==='admin'){
    const code=document.getElementById('f-code')?.value.trim();
    reset(); launchAdmin();
  }
}

function goLanding (){
  role=null;
  screen('s-landing');
}

function exitRole(){
  role=null; cart=[]; active0Id=null; foodR=0; riderR=0;
  kDone=0; kOrders=[];
  if(kInterval){ clearInterval(kInterval); kInterval=null; }
  if(_locInterval){ clearInterval(_locInterval); _locInterval=null; }
  if(_clockInterval){ clearInterval(_clockInterval); _clockInterval=null; }
  if(trackInterval){    clearInterval(trackInterval);    trackInterval=null; }

  // Unsubscribe all Supabase Realtime channels so no ghost listeners remain
  try {
    supa.channel('admin-orders-watch').unsubscribe().catch(()=>{});
    supa.channel('kitchen-orders').unsubscribe().catch(()=>{});
    supa.channel('rider-dispatch').unsubscribe().catch(()=>{});
    if(chatChannel){ chatChannel.unsubscribe().catch(()=>{}); chatChannel=null; }
    if(riderState?.phone){
      supa.channel('rider-assigned-'+riderState.phone).unsubscribe().catch(()=>{});
    }
    if(active0Id){
      supa.channel('order-chat-'+active0Id).unsubscribe().catch(()=>{});
    }
  } catch(e){}

  riderState={name:'',phone:'',rating:0,deliveries:0,online:false,regStep:0,regData:{},activeOrder:null,collected:false,todayTrips:0,todayEarnings:0};
  localStorage.removeItem('mb_kitchen');
  localStorage.removeItem('mb_pending_order');
  localStorage.removeItem('mb_active_delivery');
  localStorage.removeItem('mb_agreed_fee');
  localStorage.removeItem('mb_active_order');
  if(window._riderPollInterval){ clearInterval(window._riderPollInterval); window._riderPollInterval=null; }
  if(window._riderVisibilityCb){ document.removeEventListener('visibilitychange', window._riderVisibilityCb); window._riderVisibilityCb=null; }

  // If user arrived via ?role= URL — return to that role's login, not landing
  const urlRole = new URLSearchParams(window.location.search).get('role');
  if(urlRole === 'kitchen'){ selectRole('kitchen'); return; }
  if(urlRole === 'rider'){   selectRole('rider');   return; }
  if(urlRole === 'admin'){   screen('s-admin-login'); return; }

  screen('s-landing');
}


// === CROSS-APP REALTIME, NOTIFICATIONS & CHAT ===
// SUPABASE REALTIME — KITCHEN
function startKitchenRealtime(){
  // Remove any existing channel first
  supa.channel('kitchen-orders').unsubscribe().catch(()=>{});
  supa.channel('kitchen-orders')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},()=>{
      pollKitchen(); playBeep();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},(payload)=>{
      pollKitchen();
    })
    .subscribe(status=>{
      if(status==='SUBSCRIBED') console.log('[Realtime] kitchen subscribed');
    });
}

// SUPABASE REALTIME - RIDER (receives order dispatches)

// ─── Web Push Notifications helper ───────────────────────────────────────────
// Requests permission once and sends a system notification that appears even
// when the user is in another app/tab. Falls back silently if denied.

async function requestNotifPermission(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    await Notification.requestPermission();
  }
}

async function sendSystemNotif(title, body, onClick, intentData){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;

   // Store the navigation intent in localStorage BEFORE firing the notification.
  // If Android Chrome reloads the tab when the user taps the notification,
  // window._notifClickCb is gone — but localStorage survives the reload.
  // The app startup code reads 'mb_notif_intent' and opens the right screen.
  if(intentData){
    localStorage.setItem('mb_notif_intent', JSON.stringify({
      ...intentData,
      ts: Date.now()
    }));
  }

  const opts = {
    body,
    icon:             'web-app-manifest-192x192.png',
    badge:            'favicon-96x96.png',
    tag:              'motobite-alert',  // replaces previous notif instead of stacking
    renotify:         true,              // re-triggers sound/vibration even with same tag
    requireInteraction: true,            // stays on screen — does NOT auto-close
    vibrate:          [200, 100, 200],   // vibration pattern on mobile
    data:             intentData || {},  // SW reads this on notificationclick 
  };

  // Prefer ServiceWorker.showNotification — works on Android Chrome even when
  // the tab is in the background (new Notification() is blocked in that case).
  if('serviceWorker' in navigator){
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, opts);
      // ServiceWorker notifications don't support onclick directly —
      // the SW must post a message. Store the callback so sw-click can invoke it.
      window._notifClickCb = onClick;
      return;
    } catch(e) {
      // SW not registered or showNotification failed — fall through to new Notification()
    }
  }

  // Fallback: new Notification() — works when tab is visible / on desktop
  try {
    const n = new Notification(title, opts);
    if(onClick) n.onclick = () => { window.focus(); onClick(); n.close(); };
  } catch(e) {
    console.warn('Notification failed:', e.message);
  }
}

// ─── Persistent in-app banner — stays until dismissed, with resend support ──
// Used when the user IS in the app but the chat sheet is closed.
// Shows a sticky banner at the top with an Open Chat button and a resend timer.

let _chatBannerTimer = null;
let _chatBannerResend = null;

function showChatBanner(orderId, fromName, lastMsg, myRole){
  clearChatBanner();
  let resendCountdown = 30; // seconds until resend button activates

  const existing = document.getElementById('chat-banner');
  if(existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'chat-banner';
  banner.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:2000;
    background:linear-gradient(135deg,#1a1a2e,#16213e);
    border-bottom:2px solid var(--red);
    padding:10px 16px;display:flex;align-items:center;gap:10px;
    animation:slideDown .3s ease;box-shadow:0 4px 20px rgba(0,0,0,.5);
  `;
  banner.innerHTML = `
    <div onclick="openChat(${orderId},'${myRole}');clearChatBanner()"
      style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;padding:4px 0">
      <div style="font-size:1.4rem;flex-shrink:0">💬</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:700;color:var(--red);letter-spacing:.5px">MESSAGE FROM ${fromName.toUpperCase()}</div>
        <div style="font-size:.82rem;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-decoration:underline;text-underline-offset:2px;text-decoration-color:rgba(255,255,255,.3)">${lastMsg}</div>
      </div>
    </div>
    <button id="chat-banner-resend" style="background:var(--dark3);color:var(--muted);border:1px solid var(--line2);border-radius:6px;padding:5px 9px;font-size:.72rem;cursor:pointer;white-space:nowrap;flex-shrink:0" disabled>
      Resend (${resendCountdown}s)
    </button>
    <button onclick="clearChatBanner()" style="background:none;border:none;color:var(--muted);font-size:1.1rem;cursor:pointer;padding:0 4px;flex-shrink:0">✕</button>
  `;
  document.body.appendChild(banner);

  // Countdown to resend button
  _chatBannerTimer = setInterval(() => {
    resendCountdown--;
    const btn = document.getElementById('chat-banner-resend');
    if(!btn){ clearChatBanner(); return; }
    if(resendCountdown <= 0){
      btn.disabled = false;
      btn.style.color = 'var(--white)';
      btn.style.borderColor = 'var(--red)';
      btn.textContent = '🔔 Resend';
      btn.onclick = () => {
        resendChatNotif(orderId, fromName, myRole);
        resendCountdown = 30;
        btn.disabled = true;
        btn.style.color = 'var(--muted)';
        btn.style.borderColor = 'var(--line2)';
      };
    } else {
      btn.textContent = `Resend (${resendCountdown}s)`;
    }
  }, 1000);
}

function clearChatBanner(){
  if(_chatBannerTimer){ clearInterval(_chatBannerTimer); _chatBannerTimer = null; }
  document.getElementById('chat-banner')?.remove();
}

async function resendChatNotif(orderId, fromName, myRole){
  // Resends a "ping" broadcast so the other side gets notified again
  const ch = supa.channel('order-chat-'+orderId);
  await ch.subscribe(async status => {
    if(status === 'SUBSCRIBED'){
      await ch.send({
        type:'broadcast', event:'chat_ping',
        payload:{ orderId, fromName, fromRole: myRole }
      });
      await ch.unsubscribe();
    }
  });
  playBeep();
  toast('Ping sent — they will be notified again 🔔','ok',3000);
}

async function startRiderRealtime(){
  const phone=riderState.phone||user.phone;
  if(!phone) return;

  // Await permission so the dialog completes before any notification fires
  await requestNotifPermission();

  // ── Clean up any stale channels before re-subscribing ────────────────────
  supa.channel('rider-dispatch').unsubscribe().catch(()=>{});
  supa.channel('rider-assigned-'+phone).unsubscribe().catch(()=>{});

  // ── Handler shared by both dispatch broadcast AND postgres direct-assign ──
  // Extracted so the exact same logic fires regardless of delivery path.
  function handleIncomingOrder(payload){
    // Guard: don't accept if already on a delivery
    if(riderState.activeOrder) return;

    // BUG FIX 1: Store order in BOTH riderState AND localStorage immediately.
    // Previously the order was only set in riderState — if the rider switched
    // tabs/apps and came back, the dispatch broadcast was long gone and
    // riderState was reset, so the order vanished.
    riderState.pendingOrder = payload;   // keep pending until accepted/expired
    localStorage.setItem('mb_pending_order', JSON.stringify(payload));

    // BUG FIX 2: System notification fires correctly.
    // Previously had a stray string literal before sendSystemNotif():
    //   '🔔 New Delivery Order!', sendSystemNotif(...)
    // That made sendSystemNotif a comma-expression arg — the onClick callback
    // was never registered, so tapping the notification did nothing.
    sendSystemNotif(
      '🔔 New Delivery Order!',
      `Deliver to ${payload.customer_area} · KES ${payload.delivery_fee || payload.food_amount}`,
      () => {
        window.focus();
        // BUG FIX 3: rPanel('home') without a btn arg leaves the nav tab
        // highlight on whichever tab the rider was on. Pass the actual DOM button.
        const homeBtn = document.querySelector('#s-rider .bnav-btn[data-s="home"]');
        rPanel('home', homeBtn);
        // BUG FIX 4: renderRiderHome() creates a fresh #r-alert-zone but
        // showRiderOrderAlert() reads that element immediately after — in the
        // same synchronous call stack, before the browser has painted.
        // A single rAF ensures the DOM is settled before we inject the alert HTML.
        requestAnimationFrame(() => showRiderOrderAlert(payload));
      }, 
      { action: 'showOrder', orderId: payload.id }
    );

    playBeep();

    // BUG FIX 5: The old check was `s-rider.classList.contains('on')` which
    // is true whenever the rider section is the active screen — but the rider
    // could be on the Earnings or Delivery tab, where #r-alert-zone doesn't
    // exist yet (it's only created inside renderRiderHome's innerHTML).
    // Solution: always navigate home AND show the alert, whether the rider
    // is in the app or not.
    const homeBtn = document.querySelector('#s-rider .bnav-btn[data-s="home"]');
    rPanel('home', homeBtn);
    requestAnimationFrame(() => showRiderOrderAlert(payload));
  }

  // ── Broadcast channel — backend dispatches new orders here ───────────────
  supa.channel('rider-dispatch')
    .on('broadcast', { event:'new_order' }, ({ payload }) => {
      if(!riderState.online || riderState.activeOrder) return;
      handleIncomingOrder(payload);
    })
    .subscribe(status => {
      // BUG FIX: Reconnect automatically if Supabase drops the channel
      // (happens when browser tab goes to background for >30 s on some devices)
      if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
        console.warn('[Realtime] rider-dispatch channel lost, reconnecting in 3 s…');
        setTimeout(startRiderRealtime, 3000);
      }
    });

  // ── Postgres fallback — catches direct DB assignment (admin overrides) ───
  supa.channel('rider-assigned-'+phone)
    .on('postgres_changes', {
      event:'UPDATE', schema:'public', table:'orders',
      filter:`rider_phone=eq.${phone}`
    }, ({ new:o }) => {
      if(o.status === 'rider_assigned' && !riderState.activeOrder){
        handleIncomingOrder(o);
      }
    })
    .subscribe();

      // ── 3. Visibility-change poll — catches orders missed while backgrounded ──
  // Supabase Realtime disconnects after ~30 s on mobile when tab goes to background.
  // When rider comes back to the tab, poll immediately for any waiting order.
  // Also poll every 20 s while visible as a safety net for silently dead sockets.

  async function pollForPendingOrder(){
    if(riderState.activeOrder || !riderState.online) return;
    try {
      const data = await apiFetch('/api/rider/active-order');
      if(data?.order && !riderState.activeOrder) handleIncomingOrder(data.order);
      // Resurface saved pending order if less than 3 minutes old
      const saved = localStorage.getItem('mb_pending_order');
      if(saved && !riderState.pendingOrder){
        try {
          const o = JSON.parse(saved);
          const ageSeconds = (Date.now() - new Date(o.paid_at || o.created_at).getTime()) / 1000;
          if(ageSeconds < 180) handleIncomingOrder(o);
          else localStorage.removeItem('mb_pending_order');
        } catch{}
      }
    } catch(e){ console.warn('[poll] error:', e.message); }
  }

  // Remove any previous listener before adding a new one (prevents duplicates on reconnect)
  document.removeEventListener('visibilitychange', window._riderVisibilityCb);
  window._riderVisibilityCb = () => { if(!document.hidden) pollForPendingOrder(); };
  document.addEventListener('visibilitychange', window._riderVisibilityCb);

  // 20-second safety-net poll while tab is visible
  if(window._riderPollInterval) clearInterval(window._riderPollInterval);
  window._riderPollInterval = setInterval(() => {
    if(!document.hidden) pollForPendingOrder();
  }, 20000);

  // ── Chat listener for any already-active order ────────────────────────────
  if(riderState.activeOrder?.id){
    startRiderChatListener(riderState.activeOrder.id);
  }
}

// Rider background chat listener — persistent banner + system notification
function startRiderChatListener(orderId){
  if(!orderId) return;
  supa.channel('order-chat-'+orderId).unsubscribe().catch(()=>{});
  supa.channel('order-chat-'+orderId)
    .on('broadcast',{event:'chat_request'},({payload})=>{
      const chatOpen = chatOrderId === orderId && document.getElementById('chat-sheet')?.classList.contains('on');
      if(!chatOpen){
        // System notification — works even when rider is in another app
        sendSystemNotif(
          `💬 ${payload.customerName} wants to chat!`,
          'Tap to negotiate the delivery fee',
          () => openChat(orderId, 'rider')
        );
        showChatBanner(orderId, payload.customerName, 'Wants to negotiate delivery fee', 'rider');
        playBeep();
      }
    })
    .on('broadcast',{event:'msg'},({payload})=>{
      if(!chatMsgs[orderId]) chatMsgs[orderId]=[];
      const already = chatMsgs[orderId].some(m => m.ts === payload.ts && m.role === payload.role);
      if(!already){
        chatMsgs[orderId].push(payload);
        // Always persist — even when chat is closed, so history shows on open
        localStorage.setItem('mb_chat_'+orderId, JSON.stringify(chatMsgs[orderId]));
      }
      const chatOpen = chatOrderId === orderId && document.getElementById('chat-sheet')?.classList.contains('on');
      if(chatOpen){
        renderChatMessages(); // live update if sheet is open
      } else {
        sendSystemNotif(
          `💬 ${payload.name}`,
          payload.text.slice(0,80),
          () => openChat(orderId, 'rider')
        );
        showChatBanner(orderId, payload.name, payload.text.slice(0,60), 'rider');
        playBeep();
      }
    })
    .on('broadcast',{event:'chat_ping'},({payload})=>{
      // Other side sent a resend ping
      const chatOpen = chatOrderId === orderId && document.getElementById('chat-sheet')?.classList.contains('on');
      if(!chatOpen){
        sendSystemNotif(
          `🔔 ${payload.fromName} is waiting for your reply!`,
          'Tap to open the chat',
          () => openChat(orderId, 'rider')
        );
        showChatBanner(orderId, payload.fromName, 'Is waiting for your reply!', 'rider');
        playBeep();
      }
    })
    .subscribe();
}

// SUPABASE REALTIME — CUSTOMER ORDER TRACKING
function startOrderRealtime(oid){
  const ch='order-track-'+oid;
  supa.channel(ch).unsubscribe().catch(()=>{});
  supa.channel(ch)
    .on('postgres_changes',{
      event:'UPDATE', schema:'public', table:'orders',
      filter:`id=eq.${oid}`
    },()=>{
      renderTracking(oid);
    })
      // Background chat listener — persistent banner + system notif for customer
    .on('broadcast',{event:'msg'},({payload})=>{
      if(!chatMsgs[oid]) chatMsgs[oid]=[];
      const already = chatMsgs[oid].some(m => m.ts === payload.ts && m.role === payload.role);
      if(!already){
        chatMsgs[oid].push(payload);
        localStorage.setItem('mb_chat_'+oid, JSON.stringify(chatMsgs[oid]));
      }
      const chatOpen = chatOrderId === oid && document.getElementById('chat-sheet')?.classList.contains('on');
      if(chatOpen){
        renderChatMessages();
      } else {
        sendSystemNotif(
          `💬 ${payload.name}`,
          payload.text.slice(0,80),
          () => openChat(oid, 'customer')
        );
        showChatBanner(oid, payload.name, payload.text.slice(0,60), 'customer');
        playBeep();
      }
    })
    .on('broadcast',{event:'chat_ping'},({payload})=>{
      const chatOpen = chatOrderId === oid && document.getElementById('chat-sheet')?.classList.contains('on');
      if(!chatOpen){
        sendSystemNotif(
          `🔔 ${payload.fromName} is waiting for your reply!`,
          'Tap to open the chat',
          () => openChat(oid, 'customer')
        );
        showChatBanner(oid, payload.fromName, 'Is waiting for your reply!', 'customer');
        playBeep();
      }
    })
    .subscribe();
}

// RIDER ↔ CUSTOMER CHAT  (delivery fee negotiation)
// Uses Supabase Realtime broadcast — no extra DB table required.
// Channel name: order-chat-{orderId}
 
// Chat persistence — always keyed by orderId: 'mb_chat_<orderId>'
// saveChatMsgs(orderId) saves one order's messages
// loadChatMsgs(orderId) returns that order's messages (or [])

function saveChatMsgs(orderId){
  if(!orderId) return;
  try{
    localStorage.setItem('mb_chat_'+orderId, JSON.stringify(chatMsgs[orderId] || []));
  }catch{}
}
function loadChatMsgs(orderId){
  if(!orderId) return [];
  try{
    const raw = localStorage.getItem('mb_chat_'+orderId);
    return raw ? JSON.parse(raw) : [];
  }catch{ return []; }
}

function ensureChatSheet(){
  if(document.getElementById('chat-sheet')) return;
  document.body.insertAdjacentHTML('beforeend',`
  <div class="overlay" id="chat-ov" onclick="closeChat()" style="z-index:1100"></div>
  <aside class="sheet" id="chat-sheet" style="z-index:1200;max-height:85vh;display:flex;flex-direction:column">
    <div class="sh-in" style="display:flex;flex-direction:column;height:100%">
      <div class="sh-handle"></div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h2 class="sh-title" style="margin:0">💬 DELIVERY FEE CHAT</h2>
        <button class="btn btn-ghost btn-sm" onclick="closeChat()">✕</button>
      </div>
      <div style="background:var(--dark3);border-radius:8px;padding:10px 12px;font-size:.78rem;color:var(--orange);margin-bottom:10px">
        ⏳ Agree on a delivery fee here before the rider picks up your order. Fee is paid <strong>cash at door</strong>.
      </div>
      <div id="chat-msgs" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 0 10px;min-height:120px"></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <input class="inp" id="chat-inp" placeholder="e.g. KES 150 delivery fee?" style="flex:1"
          onkeydown="if(event.key==='Enter'&&this.value.trim())sendChatMsg()"/>
        <button class="btn btn-primary" onclick="sendChatMsg()" style="padding:0 18px">Send</button>
      </div>
      <div id="chat-quick-btns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
    </div>
  </aside>`);
}


// Global — called from onclick in chat quick buttons
// Must be global because the button HTML is injected as a string inside openChat
function setAgreedFee(){
  // Build a clean number-pad sheet instead of browser prompt (prompt is blocked on some mobiles)
  const existing = document.getElementById('fee-sheet');
  if(existing) existing.remove();

  const sheet = document.createElement('div');
  sheet.id = 'fee-sheet';
  sheet.style.cssText = `
    position:fixed;inset:0;z-index:3000;
    background:rgba(0,0,0,.7);display:flex;align-items:flex-end;
  `;
  sheet.innerHTML = `
    <div style="background:var(--dark2);border-radius:18px 18px 0 0;padding:20px 16px 32px;width:100%;max-width:480px;margin:0 auto">
      <div style="font-family:var(--fh);font-size:.9rem;letter-spacing:1px;margin-bottom:14px;text-align:center">SET AGREED DELIVERY FEE</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <span style="padding:12px 14px;background:var(--dark3);border-radius:8px;color:var(--muted);font-weight:700">KES</span>
        <input id="fee-inp" type="number" inputmode="numeric" placeholder="e.g. 150"
          style="flex:1;background:var(--dark3);border:2px solid var(--red);border-radius:8px;color:var(--white);padding:12px;font-size:1.1rem;outline:none"
          oninput="this.value=this.value.replace(/[^0-9]/g,'')"/>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        ${[50,100,150,200,300,500].map(v=>`
          <button onclick="document.getElementById('fee-inp').value=${v}"
            style="background:var(--dark3);color:var(--white);border:1px solid var(--line2);border-radius:8px;padding:10px;font-size:.85rem;cursor:pointer">
            KES ${v}
          </button>`).join('')}
      </div>
      <button onclick="confirmAgreedFee()"
        style="width:100%;background:var(--red);color:#fff;border:none;border-radius:10px;padding:14px;font-size:.95rem;font-weight:700;cursor:pointer">
        ✅ Confirm Fee
      </button>
      <button onclick="document.getElementById('fee-sheet').remove()"
        style="width:100%;background:none;color:var(--muted);border:none;padding:10px;font-size:.85rem;cursor:pointer;margin-top:4px">
        Cancel
      </button>
    </div>
  `;
  document.body.appendChild(sheet);
  setTimeout(() => document.getElementById('fee-inp')?.focus(), 100);
}

function confirmAgreedFee(){
  const val = document.getElementById('fee-inp')?.value.trim();
  if(!val || isNaN(parseInt(val)) || parseInt(val) <= 0){
    toast('Enter a valid amount','err'); return;
  }
  const fee = parseInt(val);
  riderState.agreedFee = fee;
  localStorage.setItem('mb_agreed_fee', String(fee));
  document.getElementById('fee-sheet')?.remove();
  toast(`✅ Delivery fee set: KES ${fee}`, 'ok', 4000);

  // Send confirmation message in chat so customer also sees it
  const orderId = chatOrderId || riderState.activeOrder?.id;
  if(orderId){
    const confirmMsg = {
      role: 'rider',
      name: riderState.name || 'Rider',
      text: `✅ Delivery fee agreed: KES ${fee}. I'll collect cash at the door.`,
      ts: Date.now(),
      isFeeConfirm: true
    };
    if(!chatMsgs[orderId]) chatMsgs[orderId] = [];
    chatMsgs[orderId].push(confirmMsg);
    localStorage.setItem('mb_chat_'+orderId, JSON.stringify(chatMsgs[orderId]));
    if(chatChannel){
      chatChannel.send({ type:'broadcast', event:'msg', payload: confirmMsg });
    }
    renderChatMessages();
  }

  // Refresh delivery screen so fee shows updated
  if(riderState.activeOrder) renderRiderDelivery();
}

function openChat(orderId, myRole){
  ensureChatSheet();
  chatOrderId=orderId; chatMyRole=myRole;

  // FIX 6: Always load from localStorage first — this is the history that
  // accumulated while the chat sheet was closed. In-memory chatMsgs may be
  // empty if the page was reloaded, so we always prefer the persisted version.
  try {
    const saved = localStorage.getItem('mb_chat_'+orderId);
    const persisted = saved ? JSON.parse(saved) : [];
    // Merge: keep any in-memory msgs not yet in localStorage (just sent)
    const inMem = chatMsgs[orderId] || [];
    const merged = [...persisted];
    inMem.forEach(m => {
      if(!merged.some(p => p.ts === m.ts && p.role === m.role)) merged.push(m);
    });
    merged.sort((a,b) => a.ts - b.ts);
    chatMsgs[orderId] = merged;
    if(merged.length) localStorage.setItem('mb_chat_'+orderId, JSON.stringify(merged));
  } catch { chatMsgs[orderId] = chatMsgs[orderId] || []; }

  renderChatMessages();

  // Quick-suggestion buttons (rider only)
  const qb=document.getElementById('chat-quick-btns');
  if(myRole==='rider'){
    qb.innerHTML=['KES 50','KES 100','KES 150','KES 200','KES 300','KES 500'].map(fee=>
      `<button class="btn btn-ghost btn-sm" style="font-size:.75rem" onclick="quickFee('${fee}')">${fee}</button>`
    ).join('') +  `<button class="btn btn-primary btn-sm" style="font-size:.75rem;margin-top:6px;width:100%" 
    onclick="setAgreedFee()">✅ Fee Agreed — Set Amount</button>`;
  } else {
    qb.innerHTML=['Sounds good! ✅','Can you do less?','KES 100 is fine','I accept 👍'].map(t=>
      `<button class="btn btn-ghost btn-sm" style="font-size:.75rem" onclick="quickFee('${t}')">${t}</button>`
    ).join('');
  }

  // Realtime broadcast channel for this order chat
  if(chatChannel){ chatChannel.unsubscribe().catch(()=>{}); }
  chatChannel=supa.channel('order-chat-'+orderId);
  chatChannel
    .on('broadcast',{event:'msg'},({payload})=>{
      chatMsgs[orderId] = chatMsgs[orderId] || [];
      // De-duplicate by timestamp — prevents the same msg showing twice
      const already = chatMsgs[orderId].some(m => m.ts === payload.ts && m.role === payload.role);
      if(!already){
        chatMsgs[orderId].push(payload);
        localStorage.setItem('mb_chat_'+orderId, JSON.stringify(chatMsgs[orderId]));
        renderChatMessages();
        playBeep();
      }
    })
    .subscribe();

    if(myRole === 'customer'){
  // Notify the rider a customer wants to chat
  setTimeout(async()=>{
    await chatChannel.send({
      type:'broadcast', event:'chat_request',
      payload:{ orderId, customerName: user.name }
    });
  }, 500);
  } // end if myRole==='customer'

  clearChatBanner(); // dismiss the banner now that chat is open
  document.getElementById('chat-ov').classList.add('on');
  document.getElementById('chat-sheet').classList.add('on');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('chat-inp')?.focus(),200);
}

function closeChat(){
  document.getElementById('chat-ov')?.classList.remove('on');
  document.getElementById('chat-sheet')?.classList.remove('on');
  document.body.style.overflow='';
  if(chatChannel){ chatChannel.unsubscribe().catch(()=>{}); chatChannel=null; }
}

function quickFee(text){
  document.getElementById('chat-inp').value=text;
  sendChatMsg();
}

async function sendChatMsg(){
  const inp=document.getElementById('chat-inp');
  const text=inp?.value.trim();
  if(!text) return;
  inp.value='';
  const msg={
    role: chatMyRole,
    name: chatMyRole==='rider'?(riderState.name||'Rider'):(user.name||'Customer'),
    text,
    ts: Date.now()
  };
  if(!chatMsgs[chatOrderId]) chatMsgs[chatOrderId]=[];
  chatMsgs[chatOrderId].push(msg);
  localStorage.setItem('mb_chat_'+chatOrderId, JSON.stringify(chatMsgs[chatOrderId])); // persist
  renderChatMessages();
  // Broadcast to the other side
  if(chatChannel){
    await chatChannel.send({type:'broadcast', event:'msg', payload:msg});
  }
}

function renderChatMessages(){
  const el = document.getElementById('chat-msgs');
  if(!el) return;
  const msgs = chatMsgs[chatOrderId] || [];
  if(!msgs.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:.82rem;padding:20px 0">No messages yet — say hello! 👋</div>';
    return;
  }
  el.innerHTML = msgs.map(m=>{
    const isMine = m.role === chatMyRole;
    const time = new Date(m.ts).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    return `<div style="display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'}">
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:2px">${m.name} · ${time}</div>
      <div style="background:${isMine?'var(--red)':'var(--dark3)'};color:var(--white);padding:9px 13px;border-radius:${isMine?'14px 14px 2px 14px':'14px 14px 14px 2px'};max-width:80%;font-size:.87rem;word-break:break-word">${m.text}</div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}


// === STAFF AUTH HELPERS (merged from api.js) ===

function getStaffToken() {
  const app = window.location.pathname.includes('kitchen') ? 'kitchen'
            : window.location.pathname.includes('rider') ? 'rider'
            : window.location.pathname.includes('admin') ? 'admin'
            : null;
  if (!app) return null;

  try {
    const data = JSON.parse(sessionStorage.getItem(`mb_staff_${app}`));
    if (Date.now() > data.expiresAt) {
      sessionStorage.removeItem(`mb_staff_${app}`);
      return null;
    }
    return data.token;
  } catch {
    return null;
  }
}

async function staffApi(path, options = {}) {
  const token = getStaffToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    sessionStorage.clear();
    window.location.reload();
    return;
  }

  return res.json();
}


// === CORE.JS PATCH — Apply this to the bottom of core.js ===
// This fixes the session restoration to check if functions exist before calling
// them, preventing ReferenceError on rider.html and kitchen.html where
// customer.js is not loaded.

// Replace the existing DOMContentLoaded handler in core.js with this:

document.addEventListener('DOMContentLoaded', async () => {

  // Register Service Worker for background notifications
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
    navigator.serviceWorker.addEventListener('message', e => {
      if(e.data?.type === 'NOTIF_CLICK' && window._notifClickCb){
        window._notifClickCb();
        window._notifClickCb = null;
      }
    });
  }

  // Notification intent recovery
  try {
    const intentRaw = localStorage.getItem('mb_notif_intent');
    if(intentRaw){
      const intent = JSON.parse(intentRaw);
      const age = Date.now() - (intent.ts || 0);
      localStorage.removeItem('mb_notif_intent');
      if(age < 30000) window._pendingNotifIntent = intent;
    }
  } catch(e) {}

  const saved = localStorage.getItem('mb_user');
  if(saved){ try{ user=JSON.parse(saved); }catch{} }

  // If a ?role= param is present, ALWAYS go to that role's login
  const urlRole = new URLSearchParams(window.location.search).get('role');
  if(urlRole === 'kitchen') { selectRole('kitchen'); return; }
  if(urlRole === 'admin')   { screen('s-admin-login'); return; }
  if(urlRole === 'rider')   { selectRole('rider'); return; }
  if(urlRole === 'customer'){ selectRole('customer'); return; }

  // No ?role= in URL — restore previous session as normal
  // BUT only call launch functions if they actually exist on this page
  if(localStorage.getItem('mb_kitchen')){
    role = 'kitchen';
    if(typeof launchKitchen === 'function') launchKitchen();
    else screen('s-kitchen');
    return;
  }

  if(user.name && user.phone){
    role = 'customer';
    if(typeof launchCustomer === 'function') launchCustomer();
    else screen('s-customer');
    return;
  }

  const savedRider = localStorage.getItem('mb_rider');
  if(savedRider){
    try{
      const rd = JSON.parse(savedRider);
      if(!rd.phone) throw new Error('no phone in saved rider');
      user.phone = rd.phone;

      if(rd.name){
        riderState = {
          ...riderState,
          name:      rd.name,
          phone:     rd.phone,
          rating:    rd.rating    || 0,
          deliveries:rd.deliveries|| 0,
          todayTrips:rd.todayTrips|| 0,
          status:    rd.status    || 'approved',
          online:    rd.online    || false,
        };
        role = 'rider';
        if(typeof launchRider === 'function') launchRider();
        else screen('s-rider');
        if(riderState.activeOrder?.id && typeof startRiderChatListener === 'function') 
          startRiderChatListener(riderState.activeOrder.id);

        apiFetch('/api/rider/login', {method:'POST', body:{phone:rd.phone}})
          .then(data => {
            if(!data) return;
            if(data.exists === false){
              localStorage.removeItem('mb_rider');
              role = null; screen('s-landing');
              return;
            }
            if(data.status === 'suspended'){
              localStorage.removeItem('mb_rider');
              role = null; screen('s-landing');
              toast('Your rider account has been suspended. Contact MotoBite support.','err',8000);
              return;
            }
            if(data.name && data.status === 'approved'){
              riderState = {...riderState, ...data, phone:rd.phone};
              if(rd.online) riderState.online = true;
              const updated = {...rd, name:data.name, rating:data.rating,
                deliveries:data.total_deliveries, status:data.status};
              localStorage.setItem('mb_rider', JSON.stringify(updated));
            }
          });
        return;
      }

      const data = await apiFetch('/api/rider/login',{method:'POST',body:{phone:rd.phone}});
      if(!data){
        riderState = {...riderState, phone:rd.phone, online: rd.online||false};
        role = 'rider';
        if(typeof launchRider === 'function') launchRider();
        else screen('s-rider');
        return;
      }
      if(data.name && data.status === 'approved'){
        riderState = {...riderState, ...data, phone:rd.phone};
        if(rd.online) riderState.online = true;
        const toStore = {...rd, name:data.name, rating:data.rating,
          deliveries:data.total_deliveries, status:data.status};
        localStorage.setItem('mb_rider', JSON.stringify(toStore));
        role = 'rider';
        if(typeof launchRider === 'function') launchRider();
        else screen('s-rider');
        if(riderState.activeOrder?.id && typeof startRiderChatListener === 'function')
          startRiderChatListener(riderState.activeOrder.id);
        return;
      }
      localStorage.removeItem('mb_rider');
    }catch(e){
      console.warn('Rider session restore error:', e.message);
    }
  }

  const { data: { session }} = await supa.auth.getSession();
  if(session){
    role = 'admin';
    if(typeof launchAdmin === 'function') launchAdmin();
    else screen('s-admin');
    return;
  }
});