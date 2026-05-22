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

//CUSTOMER APP
let curCat='Brand New'

async function launchCustomer(){
    screen('s-customer');
    requestNotifPermission(); // ask for browser notification permission on first launch
    const h=new Date().getHours();
    document.getElementById('c-greet').textContent=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}, ${user.name}!`;
    // Fetch menu from backend, fall back to hardcoded MENU if offline
    const data = await apiFetch('/api/menu');
if(data && Object.keys(data).length){
  Object.keys(MENU).forEach(k => delete MENU[k]); // ← wipe hardcoded MENU first
  Object.keys(data).forEach(cat => { MENU[cat] = data[cat]; });

  localStorage.setItem('mb_menu_cache', JSON.stringify({
    data,
    timestamp: Date.now()
  }));
} else {
  // Try to load from cache if fetch fails
  const cached = localStorage.getItem('mb_menu_cache');
  if(cached){
    try {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if(age < 24 * 60 * 60 * 1000){ // cache valid for 24 hours
        Object.keys(MENU).forEach(k => delete MENU[k]); // ← wipe hardcoded MENU first
        Object.keys(data).forEach(cat => { MENU[cat] = data[cat]; });
        toast('Loaded menu from cache (offline mode) 🛠️','warn',5000);
      } 
    } catch {}
  } 
}

    renderCats(); renderMenu(); updateCartUI();

    // Restore active order on login
      const savedOid = localStorage.getItem('mb_active_order');
    if(savedOid){
        const order = await apiFetch(`/api/orders/${savedOid}`);
        if(order && !['delivered','cancelled'].includes(order.status)){
            showTracking(savedOid);
        } else { 
                   localStorage.removeItem('mb_active_order');
        }
    }

    // Act on notification tap intent that survived a page reload
    if(window._pendingNotifIntent){
      const intent = window._pendingNotifIntent;
      window._pendingNotifIntent = null;
      if(intent.action === 'openChat' && intent.orderId){
        setTimeout(() => openChat(intent.orderId, intent.role || 'customer'), 400);
      }
    }
  
}



function cPanel(id, btn=null){
    document.querySelectorAll('#s-customer .sp').forEach(p=>p.classList.remove('on'));
    document.getElementById(`cp-${id}`)?.classList.add('on');
    if(btn){ document.querySelectorAll('#s-customer .bnav-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
}

function renderCats(){
    const cats=Object.keys(MENU);
    document.getElementById('cat-bar').innerHTML=cats.map(c=>`<button class="cat-btn${c===curCat?' on':''}" onclick="filterCat('${c}')">${c}</button>`).join('');
}

function filterCat(cat){ 
  curCat=cat; 
  renderCats(); 
  const section = document.querySelector('.menu-sec-lbl[data-cat="' + cat + '"]');
  if(section){
    section.scrollIntoView({behavior:'smooth', block:'start'});
  } else {
    renderMenu()
  }
}

function initCategoryScroll(){
  if(_catObserver){_catObserver.disconnect(); _catObserver = null; } // prevents duplicate observers

  _catObserver = new IntersectionObserver((entries) => { // watches which cat sections are visible on screen
    const visible = entries // keeps only sections currently visible in viewport
    .filter(e => e.isIntersecting)
    .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top); // sort from top of screen to bottom
    if(!visible.length) return;
    const cat = visible[0].target.dataset.cat;
    if(cat && cat !== curCat){ // prevent unnecessary re-renders
      curCat = cat;
      renderCats(); // highlight new cat
      const activeBtn = document.querySelector('.cat-btn.on'); 
      if(activeBtn) activeBtn.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'}); // keeps active cat centered in horizontal bar
    }
  }, {
    threshold: 0.1, // triggers when 10% visible
    rootMargin: '-20% 0px -60% 0px' // adjusts active zone, 20% from top, 60% before bottom
  });
  document.querySelectorAll('.menu-sec-lbl[data-cat]').forEach(el => _catObserver.observe(el));
}

function renderMenu(){
  const allCats = Object.entries(MENU);
    document.getElementById('menu-list').innerHTML=allCats.map(([c,items])=>`
    <div class="menu-sec-lbl" data-cat="${c}">${c}</div>
    <div class="mi-grid">${items.map((item,ii)=>`
        <div class="mi-card" style="animation-delay:${ii*.07}s" onclick="addToCart(${item.id})">
          <div class="mi-card-img">
            ${item.img
              ? `<img src="${item.img}" alt="${item.name}" loading="lazy"/>`
              : `<div class="mi-card-emoji">${F.emoji(c)}</div>`}
          </div>
          <div class="mi-card-body">
            <div class="mi-card-name">${item.name}</div>
            <div class="mi-card-desc">${item.desc || item.description || ''}</div>
            <div class="mi-card-foot">
              <div class="mi-card-price">${F.money(item.price)}</div>
              <div class="mi-add">+</div>
            </div>
          </div>
        </div>`).join('')}</div>
    `).join('');
    requestAnimationFrame(initCategoryScroll);

}




// Items that require a HC / OR chicken type choice before adding to cart
// These are items whose description says "OR / SPICY" — not wings, burgers, nuggets or
// items that already have a fixed type (Butter Chicken, Original Recipe only, Zinger etc.)
// Determines whether an item needs the HC / OR chicken type picker
// Returns true (full HC/OR picker), 'OR_ONLY' (auto-add as OR, no picker),
// or false (no choice needed)
// Name-based — works for hardcoded items AND DB-loaded items regardless of ID

function needsChickenChoice(item) {
  const name = (item.name || '').toLowerCase();
  const desc = (item.desc || item.description || '').toLowerCase();

  // ── Hard exclusions — fixed type, no choice ──────────────────────────────
  if (name.includes('zinger'))           return false;
  if (name.includes('sticky'))           return false;
  if (name.includes('nugget'))           return false;
  if (name.includes('pop'))              return false;
  if (name.includes('strip'))            return false;
  if (name.includes('bawa'))             return false;
  if (name.includes('hash brown'))       return false;
  if (name.includes('wrapstar'))         return false;
  if (name.includes('rice wrap'))        return false;
  if (name.includes('butter chicken') && !name.includes('streetwise')) return false;

  // ── OR only — Colonel Burger is Original Recipe, no HC option ─────────────
  if (name.includes('colonel burger'))   return 'OR_ONLY';

  // ── Full HC / OR choice ────────────────────────────────────────────────────
  if (name.includes('streetwise'))       return true;
  if (desc.includes('or / spicy') || desc.includes('or/spicy')) return true;
  if (name.includes('bucket'))           return true;
  if (name.includes('dipping'))          return true;
  if (name.includes('chicken lunchbox')) return true;
  if (name.includes('kiddie meal 2'))    return true;
  if (name.includes('mega wing box'))    return true;
  if (name.includes('crunch burger'))    return true;
  if (name.includes('double crunch'))    return true;
  if (name.includes('legend burger'))    return true;
  if (name.includes('nyama nyama'))      return true;
  if (name.includes('box master'))       return true;
  if (name.includes('crunch master'))    return true;
  if (name.includes('chicken')) return true;

  return false;
}

function addToCart(id){
  const item=Object.values(MENU).flat().find(i=>i.id===id);
  if(!item) return;

  const choice = needsChickenChoice(item);

  if(choice === 'OR_ONLY'){
    // Colonel Burger is Original Recipe — auto-add, no picker needed
    cart.push({...item, desc: item.desc || item.description || '', note:'', chickenType:'OR'});
    updateCartUI();
    toast(`${item.name} (OR) added! 🛒`);
    return;
  }

  if(choice === true){
    showChickenPicker(item);
    return;
  }

  // No chicken choice needed
  cart.push({...item, desc: item.desc || item.description || '', note:'', chickenType:null});
  updateCartUI();
  toast(`${item.name} added! 🛒`);
}

// ── CHICKEN TYPE PICKER ───────────────────────────────────────────────────────
// Shows a bottom sheet asking HC or OR before adding to cart.
// The choice is stored as chickenType on the cart item and shown in the cart,
// order summary, and kitchen board.

let _pickerItem = null; // item waiting for chicken type selection

function showChickenPicker(item){
  _pickerItem = item;

  // Create sheet if it doesn't exist yet
  if(!document.getElementById('chicken-sheet')){
    document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="chicken-ov" onclick="closeChickenPicker()"></div>
    <aside class="sheet" id="chicken-sheet">
      <div class="sh-in">
        <div class="sh-handle"></div>
        <h2 class="sh-title">CHOOSE YOUR CHICKEN</h2>
        <p style="font-size:.84rem;color:var(--muted);margin-bottom:18px" id="cp-item-name"></p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">

          <button class="chicken-opt" onclick="confirmChickenChoice('HC')">
            <div style="font-size:2rem;margin-bottom:6px">🔥</div>
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">Spicy</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Hot &amp; Crispy</div>
          </button>

          <button class="chicken-opt" onclick="confirmChickenChoice('OR')">
            <div style="font-size:2rem;margin-bottom:6px">🍗</div>
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">Non-Spicy</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Original Recipe</div>
          </button>

        </div>
        <button class="btn btn-ghost btn-full" onclick="closeChickenPicker()">Cancel</button>
      </div>
    </aside>`);

    // Inject button styles once
    const style = document.createElement('style');
    style.textContent=`
      .chicken-opt{
        background:var(--dark3);border:2px solid var(--line2);border-radius:var(--r);
        padding:18px 10px;cursor:pointer;color:var(--white);transition:.15s;width:100%;
      }
      .chicken-opt:hover,.chicken-opt:active{ border-color:var(--red);background:var(--dark2); }
    `;
    document.head.appendChild(style);
  }

  // Update item name label
  document.getElementById('cp-item-name').textContent = item.name;

  // Show sheet
  document.getElementById('chicken-ov').classList.add('on');
  document.getElementById('chicken-sheet').classList.add('on');
  document.body.style.overflow='hidden';
}

function confirmChickenChoice(type){
  // type is 'HC' or 'OR'
  if(!_pickerItem) return;
  const item = _pickerItem;
  _pickerItem = null;
  closeChickenPicker();

  cart.push({
    ...item,
    desc:        item.desc || item.description || '',
    note:        '',
    chickenType: type   // 'HC' or 'OR' — shown in cart, order summary & kitchen
  });
  updateCartUI();
  toast(`${item.name} (${type}) added! 🛒`);
}

function closeChickenPicker(){
  _pickerItem = null;
  document.getElementById('chicken-ov')?.classList.remove('on');
  document.getElementById('chicken-sheet')?.classList.remove('on');
  document.body.style.overflow='';
}


// Returns available add-ons for a cart item based on its name
function getAddOns(item) {
  const name = (item.name || '').toLowerCase();
  const addOns = [];

  // ── Dunk It — Streetwise 2, 3 and 5 only ────────────────────────────────
  if (['streetwise 2','streetwise 2 large','streetwise 2 meal','streetwise 2 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (2 pcs)', price:150});
  if (['streetwise 3','streetwise 3 with rice','streetwise 3 meal','streetwise 3 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (3 pcs)', price:170});
  if (['streetwise 5','streetwise 5 crunch'].includes(name))
    addOns.push({ key:'dunk', label:'Dunk It (5 pcs)', price:290});

  // ── Upsize chips ──────────────────────────────────────────────────────────
  // Regular → Large (+120): Streetwise 1, 2, 3 variants (not crunch, not 5/7)
  if (name.includes('streetwise') && !name.includes('crunch') && !name.includes('with rice') &&
      !name.includes('streetwise 5') && !name.includes('streetwise 7') && !name.includes('streetwise 9'))
    addOns.push({ key:'upsize_lg', label:'Upsize to Large Chips +120', price:120,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/4f7f0a4a-4159-7c62-35f6-1b2220b6167b.jpeg?a=c1974a1a-10e6-e981-ab6c-79ceb536ade5' });
  // Large → Family (+220): Streetwise 5 only (7 already has family chips)
  if (name.includes('streetwise 5') && !name.includes('crunch'))
    addOns.push({ key:'upsize_fam', label:'Upsize to Family Chips +220', price:220,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0838ced2-9f6c-1380-bc7e-b73894eb68dd.jpeg?a=bbffd18d-2738-770b-4b5c-d56f10b6dcf3' });

  // ── Salad — all Streetwise items ─────────────────────────────────────────
  if (name.includes('streetwise') && !name.includes('streetwise 9')) {
    addOns.push({ key:'salad_sm',  label:'Add Salad Small',   price:100,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
    addOns.push({ key:'salad_reg', label:'Add Salad Regular', price:270,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
    addOns.push({ key:'salad_lg',  label:'Add Salad Large',   price:350,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });
  }

  // ── Small Coleslaw — Burgers only (not lunchbox) ──────────────────────────
  if (name.includes('burger') && !name.includes('lunchbox'))
    addOns.push({ key:'coleslaw_sm', label:'Add Coleslaw Small', price:100,
      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/aed04276-4842-6e92-7d13-3b7521fed2b7.jpeg?a=95b7ba3d-4556-563a-1d93-d6562905f61b' });

  return addOns;
}

function toggleAddOn(cartIdx, key, price, label) {
  if(!cart[cartIdx].addOns) cart[cartIdx].addOns = {};
  if(cart[cartIdx].addOns[key]) {
    delete cart[cartIdx].addOns[key];
  } else {
    cart[cartIdx].addOns[key] = {label, price};
  }
  renderCartSheet();
  updateCartUI();
}

function updateCartUI(){
    const count=cart.length;
    const total=cart.reduce((s,item)=>{
      const addOnTotal = Object.values(item.addOns||{}).reduce((a,x)=>a+x.price,0);
      return s + item.price + addOnTotal;
    },0);
    const fl=document.getElementById('cart-float');
    if(count>0){
      fl.classList.remove('hidden');
      document.getElementById('cf-cnt').textContent=count;
      document.getElementById('cf-p').textContent=F.money(total);
    } else { fl.classList.add('hidden'); }
}

function openCart(){ renderCartSheet(); 
  document.getElementById('cart-ov').classList.add('on'); // shows the dark overlay behind the cart sheet
   document.getElementById('cart-sh').classList.add('on'); // slides the cart sheet up
   document.body.style.overflow='hidden'; } // prevents the page behind from scrolling while cart is open

function closeCart(){ document.getElementById('cart-ov').classList.remove('on'); 
  document.getElementById('cart-sh').classList.remove('on'); 
  document.body.style.overflow=''; }

function renderCartSheet(){
  const li=document.getElementById('cart-items'), su=document.getElementById('cart-sum'), ac=document.getElementById('cart-acts');
  if(!cart.length){
    li.innerHTML='<div class="empty"><div class="ei">🛒</div><h3>CART IS EMPTY</h3><p>Add items from the menu</p></div>';
    su.innerHTML=ac.innerHTML=''; return;
  }
  li.innerHTML=cart.map((item,i)=>{
    const addOns = getAddOns(item);
    const selected = item.addOns || {};
    const addOnHTML = addOns.length ? `
      <div style="margin:7px 0 4px;display:flex;flex-direction:column;gap:6px">
        ${addOns.map(a=>`
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--dark3);border-radius:8px;padding:6px 8px;border:1.5px solid ${selected[a.key]?'var(--red)':'var(--line)'}">
            <img src="${a.img}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0"/>
            <span style="flex:1;font-size:.78rem;color:var(--white)">${a.label} <strong style="color:var(--red)">+${F.money(a.price)}</strong></span>
            <input type="checkbox" ${selected[a.key]?'checked':''}
              onchange="toggleAddOn(${i},'${a.key}',${a.price},'${a.label}')"
              style="accent-color:var(--red);width:16px;height:16px;cursor:pointer;flex-shrink:0"/>
          </label>`).join('')}
      </div>` : '';
    return `
    <div class="ci">
      <div class="ci-info">
        <div class="ci-name">${item.name}${item.chickenType?` <span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:.5px;vertical-align:middle">${item.chickenType}</span>`:''}</div>
        ${addOnHTML}
        <input class="note-inp" placeholder="Special note (e.g. no onions)..." value="${item.note||''}" oninput="cart[${i}].note=this.value"/>
      </div>
      <div class="ci-r">
        <div class="ci-price">${F.money(item.price + Object.values(selected).reduce((s,a)=>s+a.price,0))}</div>
        <button class="ci-rm" onclick="removeCartItem(${i})">✕</button>
      </div>
    </div>`;
  }).join('');

  const total = cart.reduce((s,item)=>{
    return s + item.price + Object.values(item.addOns||{}).reduce((a,x)=>a+x.price,0);
  },0);

  su.innerHTML=`<div class="cart-sum">
    <div class="srow"><span>Food subtotal</span><span>${F.money(total)}</span></div>
    <div class="srow">
  <span>Delivery fee</span>
  <span class="nt" style="color:var(--orange);font-size:.75rem">⏳ Agreed with rider on assignment</span>
</div>
    <div class="srow tot"><span>Pay to KFC Till</span><span>${F.money(total)}</span></div>
  </div>`;
  ac.innerHTML=`
  <div style="font-size:.78rem;color:var(--muted);text-align:center;font-weight:700;letter-spacing:.5px;margin-bottom:10px">HOW WOULD YOU LIKE YOUR ORDER?</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">

    <button id="btn-pickup" onclick="chooseOrderType('pickup')"
      style="background:var(--dark3);border:2px solid var(--line2);border-radius:14px;
             padding:18px 10px;cursor:pointer;color:var(--white);text-align:center;transition:.15s">
      <div style="font-size:2.2rem;margin-bottom:6px">🚶</div>
      <div style="font-family:var(--fh);font-size:.88rem;letter-spacing:1px">COLLECT</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:4px">Pick up at KFC Narok</div>
      <div style="font-size:.68rem;color:var(--green);margin-top:3px;font-weight:600">No delivery fee</div>
    </button>

    <button id="btn-delivery" onclick="chooseOrderType('delivery')"
      style="background:var(--dark3);border:2px solid var(--line2);border-radius:14px;
             padding:18px 10px;cursor:pointer;color:var(--white);text-align:center;transition:.15s">
      <div style="font-size:2.2rem;margin-bottom:6px">🛵</div>
      <div style="font-family:var(--fh);font-size:.88rem;letter-spacing:1px">DELIVER</div>
      <div style="font-size:.72rem;color:var(--muted);margin-top:4px">Bring it to me</div>
      <div style="font-size:.68rem;color:var(--orange);margin-top:3px;font-weight:600">+ Rider fee applies</div>
    </button>

  </div>
  <button class="btn btn-ghost btn-full" style="color:var(--red);font-size:.82rem" onclick="cart=[];updateCartUI();closeCart()">🗑 Clear Cart</button>`;
}

function chooseOrderType(type){
  orderType = type;
  const pickup   = document.getElementById('btn-pickup');
  const delivery = document.getElementById('btn-delivery');
  if(pickup){
    pickup.style.borderColor  = type==='pickup' ? 'var(--green)' : 'var(--line2)';
    pickup.style.background   = type==='pickup' ? 'rgba(76,175,80,.18)' : 'var(--dark3)';
  }
  if(delivery){
    delivery.style.borderColor = type==='delivery' ? 'var(--red)'   : 'var(--line2)';
    delivery.style.background  = type==='delivery' ? 'rgba(229,57,53,.14)' : 'var(--dark3)';
  }
  // Brief highlight then navigate
  setTimeout(() => {
    closeCart();
    if(type === 'pickup'){
      // Self-pickup: skip location panel, go straight to payment
      userLoc = { lat: null, lng: null, areaName: 'KFC Narok (Self-Pickup)', landmark: '' };
      goToPayment();
    } else {
      // Delivery: show location panel
      cPanelLocation();
    }
  }, 200);
}

function removeCartItem(i){
   cart.splice(i,1); // removes an item from the cart when x is clicked
   updateCartUI(); renderCartSheet();
   if(!cart.length)closeCart(); }


 
// ══════════════════════════════════════════════════════════════════════════════
// LOCATION SYSTEM  —  3-path UX  (GPS → area chips → type landmark)
// Matches the HTML in cp-location: no map, no dragging, no technical concepts.
//
// Flow:
//   1. Panel opens → GPS fires automatically (user does nothing)
//   2a. GPS good + within zone → green confirmed box → one tap to continue
//   2b. GPS bad/out-of-zone   → area picker shown automatically
//   3. Area picker: tap a neighbourhood chip → confirm button lights up
//   4. Landmark field: type any extra detail (optional but helpful for rider)
// ══════════════════════════════════════════════════════════════════════════════

const KFC_LAT = -1.0907;
const KFC_LNG =  35.8710;
const MAX_KM  =  50;

// Known Narok-area delivery spots — shown as tappable chips
const NAROK_AREAS = [
  { name:'Narok Town Centre',   lat:-1.0867, lng:35.8716 },
  { name:'Narok Hospital',      lat:-1.0806, lng:35.8677 },
  { name:'Maasai Mara Uni',     lat:-1.1102, lng:35.8430 },
  { name:'Narok Stage',         lat:-1.0880, lng:35.8695 },
  { name:'Shell Petrol Station',lat:-1.0921, lng:35.8744 },
  { name:'Total Petrol Station',lat:-1.0855, lng:35.8720 },
  { name:'KCB / ABSA Bank',     lat:-1.0872, lng:35.8708 },
  { name:'Ewaso Estate',        lat:-1.0950, lng:35.8660 },
  { name:'Naserian Estate',     lat:-1.0930, lng:35.8680 },
  { name:'Police Station',      lat:-1.0841, lng:35.8699 },
  { name:'Narok Stadium',       lat:-1.0990, lng:35.8750 },
  { name:'Nakuru Road Area',    lat:-1.0820, lng:35.8760 },
  { name:'Oloolaimutia',        lat:-1.0750, lng:35.8800 },
  { name:'Melelo',              lat:-1.0650, lng:35.8550 },
];

let _gpsLat = null;
let _gpsLng = null;
let _selectedArea = null; // { name, lat, lng } from chip tap

// ── Open panel ────────────────────────────────────────────────────────────────
function cPanelLocation(){
  cPanel('location');
  // Reset to clean state every time panel opens
  _gpsLat = null; _gpsLng = null; _selectedArea = null;
  resetLocUI();
  populateAreaGrid();
  tryGPS();
}

function resetLocUI(){
  setEl('loc-gps-bar',       { display:'flex' });
  setEl('loc-gps-confirmed', { display:'none' });
  setEl('loc-area-picker',   { display:'none' });
  setEl('loc-err-box',       { text:'', cls:'hidden' });
  const lbl = document.getElementById('loc-landmark');
  if(lbl) lbl.value = '';
  enableLocBtn(false); // disabled until GPS confirms or chip/landmark selected
  setGpsStatus('📡', 'Getting your location…', false);
}

// ── Helper: set element display/text quickly ──────────────────────────────────
function setEl(id, opts={}){
  const el = document.getElementById(id);
  if(!el) return;
  if(opts.display !== undefined) el.style.display = opts.display;
  if(opts.text    !== undefined) el.textContent = opts.text;
  if(opts.html    !== undefined) el.innerHTML = opts.html;
  if(opts.cls     !== undefined){ el.className=''; if(opts.cls) el.className=opts.cls; }
}

function setGpsStatus(ico, txt, showRetry=false){
  setEl('loc-gps-ico', { text: ico });
  setEl('loc-gps-txt', { text: txt });
  const retry = document.getElementById('loc-gps-retry');
  if(retry) retry.style.display = showRetry ? 'inline' : 'none';
}

// ── GPS ───────────────────────────────────────────────────────────────────────
let _gpsWatcher = null;
let _gpsTimeout = null;
let _gpsBestAccuracy = Infinity;

function tryGPS(){
  setGpsStatus('📡', 'Getting your location…', false);
  if(!navigator.geolocation){ onGPSFail({ code:2 }); return; }

  // Clear any previous watcher
  if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
  if(_gpsTimeout)  { clearTimeout(_gpsTimeout); _gpsTimeout=null; }
  _gpsBestAccuracy = Infinity;

  // watchPosition keeps refining — cell-tower (~300m) first, then GPS chip (<20m).
  // We accept the first reading that is (a) within zone OR (b) accurate enough to trust.
  // After 15 s we give up and fall back to the area picker.
  _gpsTimeout = setTimeout(() => {
    if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
    if(!_gpsLat){
      setGpsStatus('📍', 'GPS timed out — choose your area below', true);
      showAreaPicker();
    }
  }, 15000);

  _gpsWatcher = navigator.geolocation.watchPosition(
    pos => {
      const { latitude:lat, longitude:lng, accuracy } = pos.coords;
      if(accuracy >= _gpsBestAccuracy) return; // ignore if not improving
      _gpsBestAccuracy = accuracy;

      const dist = haversine(lat, lng, KFC_LAT, KFC_LNG);

      if(dist > MAX_KM && accuracy > 200){
        // Out of zone BUT still low-accuracy — keep watching, GPS may improve
        setGpsStatus('📡', `Improving GPS… (±${Math.round(accuracy)}m)`, false);
        return;
      }

      // Commit: either within zone, or high-accuracy but truly out of zone
      clearTimeout(_gpsTimeout); _gpsTimeout=null;
      navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null;
      onGPSSuccess(pos);
    },
    err => {
      if(_gpsTimeout){ clearTimeout(_gpsTimeout); _gpsTimeout=null; }
      if(_gpsWatcher != null){ navigator.geolocation.clearWatch(_gpsWatcher); _gpsWatcher=null; }
      onGPSFail(err);
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

function onGPSSuccess(pos){
  const { latitude:lat, longitude:lng, accuracy } = pos.coords;
  const dist = haversine(lat, lng, KFC_LAT, KFC_LNG);

  // Out of zone = ISP address (Nairobi), not real device GPS
  if(dist > MAX_KM){
    setGpsStatus('⚠️', `GPS shows you ${Math.round(dist)} km away — please choose your area below`, true);
    showAreaPicker();
    return;
  }

  // Good GPS — store and show confirmed box
  _gpsLat = lat; _gpsLng = lng;

  const accLabel = accuracy < 50  ? `±${Math.round(accuracy)}m (high accuracy)`
                 : accuracy < 200 ? `±${Math.round(accuracy)}m — tap "Not right?" if off`
                 :                  `±${Math.round(accuracy)}m (approximate)`;

  setGpsStatus('✅', 'Location found', false);
  setEl('loc-gps-bar', { display:'none' });

  // Reverse geocode — get area name silently in background
  reverseGeocode(lat, lng).then(areaName => {
    _selectedArea = { lat, lng, name: areaName };
    setEl('loc-gps-area', { text: areaName });
    setEl('loc-gps-dist', { text: `${dist.toFixed(1)} km from KFC Narok  ·  ${accLabel}` });
    setEl('loc-gps-confirmed', { display:'block' });
    enableLocBtn(true);
  });
}

function onGPSFail(err){
  const msg = err.code === 1
    ? '📍 Location access denied — choose your area below'
    : '📍 GPS unavailable — choose your area below';
  setGpsStatus('📍', msg, true);
  showAreaPicker();
}

// ── Area picker ───────────────────────────────────────────────────────────────
function populateAreaGrid(){
  const grid = document.getElementById('loc-area-grid');
  if(!grid) return;
  grid.innerHTML = NAROK_AREAS.map((a,i) => `
    <button onclick="selectArea(${i})" id="area-chip-${i}"
      style="padding:11px 8px;background:var(--dark3);border:1.5px solid var(--line2);
             border-radius:10px;color:var(--white);font-size:.8rem;font-weight:600;
             cursor:pointer;text-align:center;line-height:1.25;transition:all .15s">
      ${a.name}
    </button>`).join('');
}

function showAreaPicker(){
  setEl('loc-area-picker', { display:'block' });
}

function selectArea(i){
  const area = NAROK_AREAS[i];
  if(!area) return;
  _selectedArea = { lat:area.lat, lng:area.lng, name:area.name };

  // Highlight selected chip, reset others
  NAROK_AREAS.forEach((_,j) => {
    const chip = document.getElementById(`area-chip-${j}`);
    if(!chip) return;
    if(j === i){
      chip.style.background     = 'var(--red)';
      chip.style.borderColor    = 'var(--red)';
      chip.style.color          = '#fff';
    } else {
      chip.style.background     = 'var(--dark3)';
      chip.style.borderColor    = 'var(--line2)';
      chip.style.color          = 'var(--white)';
    }
  });

  enableLocBtn(true);
  setEl('loc-err-box', { text:'', cls:'hidden' });
}

function onLandmarkInput(){
  // If no area chip is selected yet, treat a typed landmark as confirmation too
  const val = document.getElementById('loc-landmark')?.value.trim();
  if(val && val.length >= 3 && !_selectedArea){
    // Use KFC location as lat/lng fallback — rider uses the landmark text to navigate
    _selectedArea = { lat: KFC_LAT, lng: KFC_LNG, name:'Narok Town' };
  }
  if(val || _selectedArea) enableLocBtn(true);
}

// ── Confirm ───────────────────────────────────────────────────────────────────
function confirmLocation(){
  const landmark = document.getElementById('loc-landmark')?.value.trim();
  const errBox   = document.getElementById('loc-err-box');

  if(!_selectedArea && !landmark){
    errBox.textContent = 'Please choose your area or type a landmark first.';
    errBox.classList.remove('hidden');
    return;
  }

  // Merge GPS coords if available and better than chip coords
  const lat  = (_gpsLat && haversine(_gpsLat, _gpsLng, KFC_LAT, KFC_LNG) <= MAX_KM)
               ? _gpsLat : (_selectedArea?.lat ?? KFC_LAT);
  const lng  = (_gpsLng && haversine(_gpsLat, _gpsLng, KFC_LAT, KFC_LNG) <= MAX_KM)
               ? _gpsLng : (_selectedArea?.lng ?? KFC_LNG);

  const areaName   = _selectedArea?.name || 'Narok Town';
  const fullLabel  = landmark ? `${areaName} — ${landmark}` : areaName;

  userLoc = { lat, lng, areaName: fullLabel, landmark: landmark || '' };
  toast(`📍 Delivering to: ${fullLabel}`, 'ok');
  goToPayment();
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function enableLocBtn(on){
  const btn = document.getElementById('loc-btn');
  if(!btn) return;
  btn.disabled     = !on;
  btn.style.opacity = on ? '1' : '0.45';
  btn.textContent  = on ? 'Confirm Location →' : 'Confirm Location →';
}

async function reverseGeocode(lat, lng){
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers:{ 'Accept-Language':'en' } }
    );
    const d = await r.json();
    const a = d.address || {};
    return a.township || a.suburb || a.village || a.town
           || a.city_district || a.city || a.county || 'Narok Town';
  } catch { return 'Narok Town'; }
}

// Legacy stubs — keep so any old references don't crash
function getLocation(){ cPanelLocation(); }
function initLocMap(){  cPanelLocation(); }
function recenterOnGPS(){ tryGPS(); }


function escapeHtml(text) {
  if(!text) return '';
  return text 
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function goToPayment(){
  const total = cart.reduce((s,i)=>s+i.price+Object.values(i.addOns||{}).reduce((a,x)=>a+x.price,0),0);

  // Render the entire payment panel dynamically with M-Pesa + Card tabs
  const panel = document.getElementById('cp-payment');
  if(panel){
    panel.innerHTML = `
      <div class="sp-hdr">
        <button class="back-btn" onclick="cPanel('menu')">←</button>
        <h2 class="sp-title">PAYMENT</h2>
      </div>
      <div style="padding:0 16px 100px;max-width:480px;margin:0 auto">

        <!-- Order total -->
        <div style="text-align:center;margin:18px 0 22px">
          <div style="font-size:.72rem;color:var(--muted);letter-spacing:2px">ORDER TOTAL</div>
          <div style="font-family:var(--fh);font-size:2.4rem;letter-spacing:2px;color:var(--red)" id="pay-amt">${F.money(total)}</div>
        </div>

        <!-- Payment method tabs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px">
          <button id="tab-mpesa" onclick="switchPayTab('mpesa')"
            style="padding:12px 8px;border-radius:10px;border:2.5px solid var(--red);
                   background:var(--red);color:#fff;font-family:var(--fh);font-size:.8rem;
                   letter-spacing:1px;cursor:pointer;transition:.15s">
            <div style="font-size:1.3rem;margin-bottom:4px">💚</div>M-PESA
          </button>
          <button id="tab-card" onclick="switchPayTab('card')"
            style="padding:12px 8px;border-radius:10px;border:2.5px solid var(--line2);
                   background:var(--dark3);color:var(--white);font-family:var(--fh);font-size:.8rem;
                   letter-spacing:1px;cursor:pointer;transition:.15s">
            <div style="font-size:1.3rem;margin-bottom:4px">💳</div>CARD / OTHER
          </button>
        </div>

        <!-- ── M-PESA PANEL ── -->
        <div id="pay-panel-mpesa">
          <div id="stk-status" style="display:none;background:var(--dark3);border:1px solid var(--green);
            border-radius:10px;padding:14px;margin-bottom:14px;text-align:center">
            <div style="font-size:1.4rem;margin-bottom:6px">📱</div>
            <div style="font-family:var(--fh);font-size:.85rem;color:var(--green);letter-spacing:1px">CHECK YOUR PHONE</div>
            <div style="font-size:.78rem;color:var(--muted);margin-top:4px">Enter your M-Pesa PIN to complete payment</div>
          </div>
          <div id="manual-pay">
            <div style="background:var(--dark3);border-radius:10px;padding:14px;margin-bottom:16px;font-size:.83rem">
              <div style="font-family:var(--fh);font-size:.75rem;color:var(--muted);letter-spacing:1.5px;margin-bottom:10px">HOW TO PAY</div>
              <div style="display:flex;flex-direction:column;gap:8px;color:var(--white)">
                <div>1. Go to <strong>M-Pesa → Lipa na M-Pesa → Buy Goods</strong></div>
                <div>2. Till Number: <strong style="color:var(--red);font-size:1.05rem">9119681</strong></div>
                <div>3. Amount: <strong style="color:var(--red)" id="pay-amt2">${F.money(total)}</strong></div>
              </div>
            </div>
            <div class="field" style="margin-bottom:12px">
              <label class="field-lbl">M-Pesa Registered Name</label>
              <input class="inp" id="mpesa-name" placeholder="e.g. JOHN DOE" style="text-transform:uppercase"/>
            </div>
            <div class="field" style="margin-bottom:18px">
              <label class="field-lbl">Amount Paid (KES)</label>
              <input class="inp" id="mpesa-amount" type="number" inputmode="numeric"
                placeholder="${total}" value="${total}"/>
            </div>
          </div>
          <button class="btn btn-primary btn-full btn-lg" id="pay-btn" onclick="initPay()">
            ✅ I Have Paid — Place Order
          </button>
        </div>

        <!-- ── PESAPAL CARD PANEL ── -->
        <div id="pay-panel-card" style="display:none">
          <div style="background:var(--dark3);border-radius:10px;padding:16px;margin-bottom:16px;text-align:center;font-size:.83rem;color:var(--muted)">
            Pay securely with <strong style="color:var(--white)">Visa · Mastercard · Amex</strong><br>
            or bank transfer — powered by Pesapal.
            <div style="margin-top:12px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                style="height:16px;opacity:.85" alt="Visa"/>
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                style="height:24px;opacity:.85" alt="Mastercard"/>
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg"
                style="height:20px;opacity:.85" alt="Amex"/>
            </div>
          </div>

          <div style="background:var(--dark3);border-radius:10px;padding:12px 14px;margin-bottom:16px;
            display:flex;justify-content:space-between;align-items:center;font-size:.84rem">
            <span style="color:var(--muted)">You will be charged</span>
            <span style="font-family:var(--fh);font-size:1.15rem;color:var(--red);letter-spacing:1px">${F.money(total)}</span>
          </div>

          <div style="background:var(--dark3);border-radius:10px;padding:11px 14px;margin-bottom:20px;
            font-size:.78rem;color:var(--muted);display:flex;gap:8px;align-items:flex-start">
            <span style="color:var(--green);font-size:1rem;flex-shrink:0">🔒</span>
            <span>Your order is placed first. A secure Pesapal payment page opens — your card details never touch our servers.</span>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="card-pay-btn" onclick="initPesapalPayment()">
            💳 Pay ${F.money(total)} with Card
          </button>
          <div style="text-align:center;margin-top:10px;font-size:.72rem;color:var(--muted)">
            Secured by <strong style="color:var(--white)">Pesapal</strong> · PCI-DSS compliant · SSL encrypted
          </div>
        </div>

      </div>`;
  }
  cPanel('payment');
}

// Switch M-Pesa ↔ Card tabs
function switchPayTab(tab){
  const isMpesa = tab === 'mpesa';
  const active  = { background:'var(--red)', borderColor:'var(--red)', color:'#fff' };
  const idle    = { background:'var(--dark3)', borderColor:'var(--line2)', color:'var(--white)' };
  const apply   = (el, styles) => el && Object.assign(el.style, styles);

  apply(document.getElementById('tab-mpesa'), isMpesa ? active : idle);
  apply(document.getElementById('tab-card'),  isMpesa ? idle : active);

  const mpesaPane = document.getElementById('pay-panel-mpesa');
  const cardPane  = document.getElementById('pay-panel-card');
  if(mpesaPane) mpesaPane.style.display = isMpesa ? 'block' : 'none';
  if(cardPane)  cardPane.style.display  = isMpesa ? 'none'  : 'block';
}

async function initPay() {
  if(!cart || !cart.length){
    toast('Your cart is empty! Add items before placing an order.','err',4000); return;
  }
const mpesaName = document.getElementById('mpesa-name')?.value.trim().toUpperCase();
const amountPaid = parseInt(document.getElementById('mpesa-amount')?.value);
const orderTotal = cart.reduce((s,i)=>s+i.price+Object.values(i.addOns||{}).reduce((a,x)=>a+x.price,0),0);

if(!userLoc && orderType !== 'pickup'){
  toast('📍 Please confirm your delivery location first','err',4000);
  cPanelLocation(); return;
}

if(!mpesaName || mpesaName.length < 3){
  toast('Enter your M-Pesa registered name','err',4000); return;
}

if(!amountPaid || amountPaid < orderTotal){
  toast(`Amount must be at least KES ${orderTotal.toLocaleString()}`,'err',4000); return;
}
  const btn=document.getElementById('pay-btn');
  btn.innerHTML='<span class="spin"></span> Placing order...'; btn.disabled=true;
  const total=orderTotal;
  const notes=cart.filter(i=>i.note||i.chickenType||Object.keys(i.addOns||{}).length).map(i=>{
    const addOnStr = Object.values(i.addOns||{}).map(a=>a.label).join(', ');
    return `${i.name}${i.chickenType?' ['+i.chickenType+']':''}${addOnStr?' + '+addOnStr:''}: ${i.note||''}`;
  }).join('; ');
  const orderItems = cart.map(item => ({
    ...item,
    price: item.price + Object.values(item.addOns||{}).reduce((s,a)=>s+a.price,0)
  }));

  const order=await apiFetch('/api/orders',{method:'POST',body:{
    customer_phone: user.phone,
    customer_name:  user.name,
    items:orderItems, notes, 
    order_type: orderType,
    location: orderType === 'pickup' ? null : userLoc,
    customer_lat:  orderType === 'pickup' ? null : userLoc?.lat,
    customer_lng:   orderType === 'pickup' ? null : userLoc?.lng,
    customer_area:  orderType === 'pickup' ? 'KFC Narok (Self-Pickup)' : userLoc?.areaName,
    mpesa_reference:`${mpesaName} · KES ${amountPaid}`
  }});

  

  // If order creation failed — stop here, show error, let customer try again
  if(!order?.id){
    btn.innerHTML='✅ I Have Paid — Place Order'; btn.disabled=false;
    toast('Could not place order — check your connection and try again','err',5000);
    return;
  }

  const oid=order.id;
  active0Id=oid;
  localStorage.setItem('mb_active_order',oid);
 
  // Show STK status box if the backend sent a push, otherwise keep manual instructions
    const stkBox=document.getElementById('stk-status');
  const manualPay=document.getElementById('manual-pay');
  if(order.stkSent){
    // STK push was sent — highlight the phone prompt
    if(stkBox)  stkBox.style.display='block';
    if(manualPay) manualPay.style.display='none';
    cart = []; updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden'); // hide View Order btn
    btn.innerHTML='📱 Waiting for M-Pesa payment...'; btn.disabled=true;
    toast('Check your phone — M-Pesa prompt sent! 📱','ok',6000);
  } else {
    // Manual payment flow
    btn.innerHTML = '✅ Confirm Payment';
    btn.disabled = false;
    btn.onclick = () => confirmPayment(oid);
    toast('Order placed! Pay via M-Pesa, then click "Confirm Payment" 📱', 'ok', 5000);
    cart = [];
    updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden'); // hide View Order btn
    showTracking(oid);
  } // end else
} // end initPay

// Customer confirms they have paid via M-Pesa
async function confirmPayment(orderId) {
  const btn = document.getElementById('pay-btn');
  if (!btn) return;
  
  // Confirm with user
  if (!confirm('Have you completed the M-Pesa payment?')) return;
  
  btn.innerHTML = '<span class="spin"></span> Confirming payment...';
  btn.disabled = true;
  
  const res = await apiFetch(`/api/orders/${orderId}/confirm-payment`, {
    method: 'PUT'
  });
  
  if (res?.success) {
    toast('✅ Payment confirmed! Your order is being prepared.', 'ok');
    // Clear cart and hide float so "View Order" button disappears
    cart = [];
    updateCartUI();
    // Update order status
    active0Id = orderId;
    localStorage.setItem('mb_active_order', orderId);
    // Refresh tracking to show updated status
    showTracking(orderId);
  } else {
    toast(res?.error || '❌ Failed to confirm payment. Try again.', 'err');
    btn.innerHTML = '✅ I Have Paid';
    btn.disabled = false;

    if (res?.success) {
    document.getElementById('cart-float')?.classList.add('hidden'); // ADD
    
    }
  }
}

// ── PESAPAL CARD PAYMENT ──────────────────────────────────────────────────────
// Flow:
//  1. Create order in our DB (status: pending)
//  2. Call backend → Pesapal API → get hosted payment URL
//  3. Open full-screen iframe overlay with Pesapal's payment page
//  4. Poll our backend every 3 s for status change
//  5. When status ≠ 'pending' → payment done → close iframe → tracking screen
//  6. Pesapal also sends an IPN webhook to backend (belt-and-suspenders)

let _pesapalPollTimer = null;
// ✅ Fix - track if an order was already created
let _pendingCardOrderId = null;
let _savedCart = []; // In case we need to restore cart if payment fails or is cancelled
async function initPesapalPayment() {
  const btn = document.getElementById('card-pay-btn');

  // ── Guard: cart must have items ──────────────────────────────────────────
  if (!cart || cart.length === 0) {
    toast('Your cart is empty', 'err', 3000);
    return;
  }

  // ── Calculate total & build order data ──────────────────────────────────
  const total = cart.reduce((s, i) =>
    s + i.price + Object.values(i.addOns || {}).reduce((a, x) => a + x.price, 0), 0
  );

  const notes = cart
    .filter(i => i.note || i.chickenType || Object.keys(i.addOns || {}).length)
    .map(i => {
      const addOnStr = Object.values(i.addOns || {}).map(a => a.label).join(', ');
      return `${i.name}${i.chickenType ? ' [' + i.chickenType + ']' : ''}${addOnStr ? ' + ' + addOnStr : ''}: ${i.note || ''}`;
    }).join('; ');

  const orderItems = cart.map(item => ({
    ...item,
    price: item.price + Object.values(item.addOns || {}).reduce((s, a) => s + a.price, 0)
  }));

  // ── Guard: delivery needs a location ────────────────────────────────────
  const orderType = (typeof _orderType !== 'undefined') ? _orderType : 'delivery';

  if (orderType !== 'pickup' && !userLoc) {
    toast('📍 Please confirm your delivery location first', 'err', 4000);
    cPanelLocation();
    return;
  }

  // ── If pending order exists, re-use it ──────────────────────────────────
  if (_pendingCardOrderId) {
    if (btn) { btn.innerHTML = '<span class="spin"></span> Reopening payment...'; btn.disabled = true; }

    const session = await apiFetch(
      `/api/orders/${_pendingCardOrderId}/pesapal-checkout`,
      { method: 'POST' }
    );

    if (session?.redirectUrl) {
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      openPesapalIframe(session.redirectUrl, _pendingCardOrderId, session.orderNumber, total);
      return;
    }

    // Session re-fetch failed — fall through to create a new order
    _pendingCardOrderId = null;
  }

  // ── Disable button ───────────────────────────────────────────────────────
  if (btn) { btn.innerHTML = '<span class="spin"></span> Setting up payment...'; btn.disabled = true; }

  try {
    // ── Step 1: Create order ───────────────────────────────────────────────
    const order = await apiFetch('/api/orders', {
      method: 'POST',
      body: {
        customer_phone:  user.phone,
        customer_name:   user.name,
        items:           orderItems,
        notes,
        location:        userLoc,
        customer_lat:    userLoc?.lat,
        customer_lng:    userLoc?.lng,
        customer_area:   userLoc?.areaName,
        order_type:      orderType,
        payment_method:  'card',
        mpesa_reference: 'CARD — awaiting Pesapal confirmation'
      }
    });

    if (!order?.id) {
      toast('Could not create order — check your connection', 'err', 5000);
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      return;
    }

    // Save order ID in case user cancels and retries
    _pendingCardOrderId = order.id;

    // ── Step 2: Get Pesapal payment URL ───────────────────────────────────
    const session = await apiFetch(
      `/api/orders/${order.id}/pesapal-checkout`,
      { method: 'POST' }
    );

    if (!session?.redirectUrl) {
      toast(session?.error || 'Payment session failed — use M-Pesa instead', 'err', 6000);
      if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
      return;
    }

    // ── Step 3: Clear cart ONLY after URL confirmed ────────────────────────
    _savedCart = [...cart]; // backup in case we need to restore
    cart = [];
    updateCartUI();
    document.getElementById('cart-float')?.classList.add('hidden');

    // ── Step 4: Open iframe ────────────────────────────────────────────────
    if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
    openPesapalIframe(session.redirectUrl, order.id, order.order_number, total);

  } catch (err) {
    console.error('Pesapal init error:', err);
    toast('Something went wrong — please try again', 'err', 5000);
    if (btn) { btn.innerHTML = `💳 Pay ${F.money(total)} with Card`; btn.disabled = false; }
  }
}

function openPesapalIframe(payUrl, orderId, orderNumber, total){
  // Remove any stale overlay
  document.getElementById('pesapal-overlay')?.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <div id="pesapal-overlay" style="
      position:fixed;inset:0;z-index:9999;background:#000;
      display:flex;flex-direction:column;overflow:hidden">

      <!-- Top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:12px 16px;background:#111;flex-shrink:0;border-bottom:1px solid #222">
        <div>
          <div style="font-size:.7rem;color:#888;letter-spacing:1.5px">SECURE PAYMENT</div>
          <div style="font-family:var(--fh);font-size:.95rem;color:#fff;letter-spacing:1px;margin-top:2px">
            Order ${orderNumber} · ${F.money(total)}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:.7rem;color:var(--green)">🔒 Pesapal</span>
          <button onclick="cancelPesapalPayment()"
            style="background:#222;border:1px solid #333;color:#fff;padding:7px 14px;
                   border-radius:8px;font-size:.82rem;cursor:pointer">
            Cancel
          </button>
        </div>
      </div>

      <!-- Loading indicator (hidden once iframe loads) -->
      <div id="pesapal-loading" style="position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);text-align:center;color:#666">
        <div class="spin" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px"></div>
        <div style="font-size:.82rem">Loading secure payment...</div>
      </div>

      <!-- Pesapal hosted page -->
      <iframe id="pesapal-frame" src="${payUrl}"
        onload="document.getElementById('pesapal-loading').style.display='none'"
        style="flex:1;border:none;width:100%;background:#fff"
        allow="payment *">
      </iframe>

    </div>`);

  document.body.style.overflow = 'hidden';

  // ── Step 4: Poll for payment completion ───────────────────────────────────
  // IPN webhook will update the DB; polling picks it up within 3 s
  if(_pesapalPollTimer) clearInterval(_pesapalPollTimer);
  let pollCount = 0;
  const MAX_POLLS = 200; // 200 × 3 s = 10 minutes max

  _pesapalPollTimer = setInterval(async () => {
    pollCount++;
    if(pollCount > MAX_POLLS){
      clearInterval(_pesapalPollTimer); _pesapalPollTimer = null;
      toast('Payment session timed out — check order history or contact KFC Narok','err',8000);
      closePesapalOverlay();
      return;
    }

    const o = await apiFetch(`/api/orders/${orderId}`);
    if(!o) return; // network blip — retry next poll

    // Any status other than 'pending' means payment was processed
    if(o.status !== 'pending'){
      clearInterval(_pesapalPollTimer); _pesapalPollTimer = null;
      closePesapalOverlay();

      active0Id = orderId;
      localStorage.setItem('mb_active_order', orderId);

      const msg = o.status === 'ready'
        ? `✅ Payment confirmed! Order ${o.order_number} is ready to collect 🏃`
        : `✅ Payment confirmed! Order ${o.order_number} is being prepared 🍗`;
      toast(msg, 'ok', 6000);
      showTracking(orderId);
    }
  }, 3000);
}

function closePesapalOverlay(){
  if(_pesapalPollTimer){ clearInterval(_pesapalPollTimer); _pesapalPollTimer = null; }
  const overlay = document.getElementById('pesapal-overlay');
  if(overlay){ overlay.style.opacity='0'; overlay.style.transition='opacity .25s'; setTimeout(()=>overlay.remove(),260); }
  document.body.style.overflow = '';
}

function cancelPesapalPayment(total){
  closePesapalOverlay();

  // Restore cart so customer can try again or choose M-Pesa instead
  if(_savedCart && _savedCart.length){
  cart = [..._savedCart];
  updateCartUI();
  }
  // Order exists in DB as 'pending' — customer can retry or pay via M-Pesa
  // Admin can see it and ignore if not paid after 30 min
  toast('Payment cancelled — your order is saved. Try again or use M-Pesa.','', 6000);
  const btn = document.getElementById('card-pay-btn');
  if(btn){ btn.innerHTML=`💳 Pay with Card`; btn.disabled=false; }
}
// ── END PESAPAL ───────────────────────────────────────────────────────────────

function showTracking(oid){
    cPanel('track');
    document.querySelectorAll('#s-customer .bnav-btn').forEach(b=>b.classList.toggle('on',b.dataset.s==='track'));

      // ADD — hide cart float once order is placed
  document.getElementById('cart-float')?.classList.add('hidden');

    renderTracking(oid);
    startOrderRealtime(oid); // FIX: get instant status updates instead of waiting for next poll
    if(trackInterval) clearInterval(trackInterval);
    trackInterval = setInterval(()=>renderTracking(oid), 12000);
    setTimeout(()=>{ clearInterval(trackInterval); trackInterval=null; }, 300000);
}

async function loadHistory(){
  const data = await apiFetch('/api/customer/orders');
  const orders = data?.orders || [];
  document.getElementById('hist-list').innerHTML = orders.length
    ? orders.map(o => historyRow(o)).join('')
    : '<div class="empty"><div class="ei">📋</div><h3>NO ORDERS YET</h3><p>Your order history will appear here</p></div>';
}

function historyRow(o){
  const items = (o.items||[]).slice(0,2).map(i=>i.name).join(', ') + (o.items?.length>2?'…':'');
  return `<div class="o-row">
    <div class="or-l">
      <div class="or-num">${o.order_number}</div>
      <div class="or-m">${items} · ${o.customer_area||'Narok'} · ${F.date(o.created_at)}</div>
    </div>
    <div class="or-r">
      <div class="or-p">${F.money(o.food_amount)}</div>
      <span class="badge ${F.badge(o.status)}" style="margin-top:3px">${F.status(o.status, o.order_type)}</span>
    </div>
  </div>`;
}

async function renderTracking(oid) {
  document.getElementById('cart-float')?.classList.add('hidden');

  let o = await apiFetch(`/api/orders/${oid}`);
  if(!o){
    document.getElementById('track-body').innerHTML = `
      <div class="empty" style="padding-top:60px">
        <div class="ei">📦</div>
        <h3>ORDER NOT FOUND</h3>
        <p style="font-size:.83rem;color:var(--muted)">
          Could not load order #${oid}.<br>
          Check your connection or contact KFC Narok.
        </p>
        <button class="btn btn-ghost" style="margin-top:16px"
          onclick="cPanel('menu')">← Back to Menu</button>
      </div>`;
    return;
  }

  const isPickup = o.order_type === 'pickup';

  // ── Steps ──────────────────────────────────────────────────────────────
  const steps = isPickup ? [
    {lbl:'Order Placed', ico:'📋', match:['pending','paid','cooking','ready','delivered']},
    {lbl:'Being Prepared',      ico:'🍗', match:['cooking','ready','delivered']},
    {lbl:'Ready for pickup',        ico:'✅', match:['ready','delivered']},
    {lbl:'Collected',    ico:'🏃', match:['delivered']},
  ] : [
    {lbl:'Order Placed', ico:'📋', match:['pending','paid','cooking','ready','rider_assigned','picked_up','delivered']},
    {lbl:'Cooking',      ico:'🍗', match:['cooking','ready','rider_assigned','picked_up','delivered']},
    {lbl:'On Way',       ico:'🏍️', match:['picked_up','delivered']},
    {lbl:'Done',         ico:'✅', match:['delivered']},
  ];

  const ai = steps.findLastIndex(s => s.match.includes(o.status));

  // ── ETA text ───────────────────────────────────────────────────────────
const etaText = o.status === 'delivered'
  ? (isPickup ? 'Order collected — enjoy your meal! 🍗' : 'Delivered successfully 🎉')
  : isPickup
    ? o.status === 'ready'
      ? '🎉 Ready for pickup! Come to the counter with your order number'
      : o.status === 'cooking'
        ? '🍗 Being prepared — Est. 10–15 minutes'
        : '⏳ Order received — Est. 15–25 minutes'
    : '🏍️ Out for delivery — Est. 20–40 minutes';
  // ── Pickup info card ───────────────────────────────────────────────────
  // ✅ Bug 4 fixed — added padding
  const pickupInfoCard = isPickup ? `
    <div style="background:var(--dark3);border-radius:12px;padding:16px;
         margin-bottom:12px;display:flex;align-items:flex-start;gap:14px">
      <div style="font-size:2rem;flex-shrink:0">🏪</div>
      <div>
        <div style="font-weight:700;font-size:.9rem;color:var(--white);margin-bottom:4px">
          SELF PICKUP — KFC NAROK
        </div>
        <div style="font-size:.8rem;color:var(--muted);line-height:1.5">
          Come to the counter and show your order number.<br>
          <strong style="color:var(--white)">${o.order_number}</strong>
        </div>
      </div>
    </div>
  ` : '';

  // ── Ready card ─────────────────────────────────────────────────────────
  const readyCard = (isPickup && o.status === 'ready') ? `
    <div style="background:rgba(46,204,113,0.12);border:2px solid var(--green);
         border-radius:12px;padding:18px 16px;margin-bottom:12px;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:8px">🎉</div>
      <div style="font-family:var(--fh);font-size:1.1rem;color:var(--green);
           letter-spacing:1px;margin-bottom:6px">YOUR ORDER IS READY!</div>
      <div style="font-size:.83rem;color:var(--muted);margin-bottom:16px">
        Please collect from the counter.<br>
        Show order number
        <strong style="color:var(--white)">${o.order_number}</strong>
      </div>
      <button class="btn btn-primary btn-full btn-lg"
        onclick="markPickupCollected('${oid}')"
        style="background:var(--green);color:#000;border-color:var(--green)">
        ✅ I Have Collected My Order
      </button>
    </div>
  ` : '';

  // ── Collected confirmation card ────────────────────────────────────────
  // ✅ Bug 1 fixed — styl=e → style
  const collectedCard = (isPickup && o.status === 'delivered') ? `
    <div style="background:rgba(46,204,113,0.1);border:1.5px solid var(--green);
         border-radius:12px;padding:16px;margin-bottom:12px;text-align:center">
      <div style="font-size:2rem;margin-bottom:8px">✅</div>
      <div style="font-weight:700;color:var(--green);margin-bottom:4px">
        ORDER COLLECTED!
      </div>
      <div style="font-size:.8rem;color:var(--muted)">
        Enjoy your meal — thank you for choosing KFC Narok 🍗
      </div>
    </div>
  ` : '';

  // ── Delivery only sections ─────────────────────────────────────────────
  const riderSection = (!isPickup &&
    (o.status === 'pending' || o.status === 'paid') && !o.rider_name) ? `
    <div class="card" style="margin-top:11px">
      <div class="card-t">🚴 CHOOSE YOUR RIDER</div>
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:12px">
        Select a rider to deliver your order
      </p>
      <div id="rider-list" style="max-height:200px;overflow-y:auto">
        <div style="text-align:center;padding:20px">
          <span class="spin"></span> Loading riders...
        </div>
      </div>
    </div>
  ` : '';

  const assignedRider = (!isPickup && o.rider_name) ? `
    <div class="card" style="margin-top:11px;background:var(--dark2)">
      <div class="card-t">🏍️ RIDER ASSIGNED</div>
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0">
        <div style="font-size:2rem">🏍️</div>
        <div>
          <div style="font-weight:600">${o.rider_name}</div>
          <div style="font-size:.8rem;color:var(--muted)">
            ⭐ ${o.rider_rating || 'New'} · On the way
          </div>
        </div>
      </div>
      ${o.status !== 'delivered' ? `
        <button class="btn btn-ghost btn-full" style="margin-top:8px"
          onclick="openChat(${o.id},'customer')">💬 Chat with Rider</button>
      ` : ''}
    </div>
  ` : '';

  const mapSection = !isPickup ? `
    ${o.rider_lat ? `
      <div class="map-ph">
        <span style="position:relative;z-index:1;font-size:.85rem;color:var(--muted2)">
          Rider location
        </span>
        <a class="map-link"
          href="https://maps.google.com/?q=${o.rider_lat},${o.rider_lng}"
          target="_blank">📍 Open Map</a>
      </div>
    ` : `
      <div class="map-ph">
        <span style="position:relative;z-index:1;font-size:.8rem;color:var(--muted)">
          Map updates when rider is assigned
        </span>
      </div>
    `}
  ` : '';

  const pinReminder = !isPickup ? `
    <div class="card" style="margin-top:11px;text-align:center;
         font-size:.81rem;color:var(--muted)">
      🔐 Delivery PIN sent to your phone via SMS<br>
      <span style="font-size:.73rem">
        Share it with your rider
        <strong style="color:var(--white)">only after</strong> receiving your food
      </span>
    </div>
  ` : '';

  // ── Rating card ────────────────────────────────────────────────────────
  // ✅ Bug 5 fixed — unified rating system using setRating() + submitRating()

  // ✅ After — also checks if already rated:
const alreadyRated = o.rated ||localStorage.getItem(`mb_rated_${oid}`) === 'true';

const ratingCard = (o.status === 'delivered' && !alreadyRated) ? `
  <div class="card" style="margin-top:11px" id="rating-card">
    <div class="card-t">RATE YOUR EXPERIENCE</div>

    <p style="font-size:.8rem;color:var(--muted);margin-bottom:10px">
      Food quality:
    </p>
    <div class="stars" id="food-stars">
      ${[1,2,3,4,5].map(n =>
        `<span class="star" onclick="setRating('food',${n})">☆</span>`
      ).join('')}
    </div>

    ${!isPickup ? `
      <p style="font-size:.8rem;color:var(--muted);margin:12px 0 8px">
        Rider service:
      </p>
      <div class="stars" id="rider-stars">
        ${[1,2,3,4,5].map(n =>
          `<span class="star" onclick="setRating('rider',${n})">☆</span>`
        ).join('')}
      </div>
    ` : ''}

    <button class="btn btn-primary btn-full" style="margin-top:14px"
      onclick="submitRating()">
      Submit Rating
    </button>
  </div>
` : (o.status === 'delivered' && alreadyRated) ? `

  <!-- ✅ Show thank you message instead of rating card -->
  <div style="text-align:center;padding:16px;font-size:.82rem;color:var(--muted)">
    ⭐ Thanks for rating this order!
  </div>

` : '';
 


  // ── Render HTML ────────────────────────────────────────────────────────
  document.getElementById('track-body').innerHTML = `

    <div class="trk-hdr">
      <div class="trk-no">Order ${o.order_number}</div>
      <div style="display:flex;align-items:center;gap:8px;
           justify-content:center;margin-top:4px">

        ${isPickup
          // ✅ Bug 2 & 3 fixed — quoted style, correct color
          ? `<span style="background:var(--green);color:#000;font-size:.65rem;
                font-weight:800;padding:2px 8px;border-radius:4px;
                letter-spacing:1px">SELF PICKUP</span>`
          : `<span style="background:var(--red);color:#fff;font-size:.65rem;
                font-weight:800;padding:2px 8px;border-radius:4px;
                letter-spacing:1px">DELIVERY</span>`
        }

        <div class="trk-st">${F.status(o.status, isPickup ? 'pickup' : 'delivery')}</div>
      </div>
      <div class="trk-eta" style="margin-top:6px">${etaText}</div>
    </div>

    <div class="prog">
      ${steps.map((s,i) => `
        <div class="ps ${i<ai?'done':''} ${i===ai?'act':''}">
          <div class="pd">${i<ai?'✓':s.ico}</div>
          <div class="pl">${s.lbl}</div>
        </div>
        ${i<steps.length-1 ? `
          <div style="flex:1;height:2px;
            background:${i<ai?'var(--green)':'var(--line2)'};
            margin-bottom:20px">
          </div>` : ''}
      `).join('')}
    </div>

    <div style="padding:0 16px 16px;max-width:500px;margin:0 auto">
      ${pickupInfoCard}
      ${readyCard}
      ${collectedCard}
      ${mapSection}
      ${riderSection}
      ${assignedRider}

      <div class="card">
        <div class="card-t">ORDER SUMMARY</div>
        ${(o.items||[]).map(i => `
          <div style="display:flex;justify-content:space-between;padding:7px 0;
               border-bottom:1px solid var(--line);font-size:.87rem">
            <span>
              ${i.name}
              ${i.chickenType ? `
                <span style="background:var(--red);color:#fff;font-size:.62rem;
                     font-weight:700;padding:1px 5px;border-radius:3px;
                     margin-left:4px">${i.chickenType}</span>` : ''}
              ${i.note ? `
                <span style="color:var(--orange);font-size:.73rem">
                  (${i.note})
                </span>` : ''}
            </span>
            <span style="font-family:var(--fh);color:var(--red);letter-spacing:1px">
              ${F.money(i.price)}
            </span>
          </div>
        `).join('')}
      </div>

      ${pinReminder}
      ${ratingCard}
    </div>
  `;

  // ✅ Bug 6 fixed — closing brace was missing
  if (!isPickup && (o.status === 'pending' || o.status === 'paid') && !o.rider_name) {
    loadAvailableRiders(o.id);
  }
} // ← closes renderTracking()


// ── PICKUP COLLECTED ──────────────────────────────────────────────────────────
async function markPickupCollected(oid) {
  const btn = document.querySelector(`[onclick="markPickupCollected('${oid}')"]`);
  if (btn) { btn.innerHTML = '<span class="spin"></span> Confirming...'; btn.disabled = true; }

  const res = await apiFetch(`/api/orders/${oid}/collected`, { method: 'POST' });

  if (res?.success) {
    toast('✅ Order collected — enjoy your meal! 🍗', 'ok', 5000);
    renderTracking(oid);
  } else {
    toast(res?.error || 'Failed to confirm collection — try again', 'err', 4000);
    if (btn) { btn.innerHTML = '✅ I Have Collected My Order'; btn.disabled = false; }
  }
}




// Load available riders and display them
async function loadAvailableRiders(orderId) {
  const list = document.getElementById('rider-list');
  if (!list) return;
  
  // Correct URL — route is /api/rider/available
  const riders = await apiFetch('/api/rider/available');
  
  if (!riders || riders.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">No riders available right now. Please try again in a moment...</div>';
    // Retry after 10 seconds
    setTimeout(() => loadAvailableRiders(orderId), 10000);
    return;
  }
  
  list.innerHTML = riders.map(r => `
    <div class="rider-select" onclick="selectRider(${orderId}, '${r.phone}', this)" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--dark3);border-radius:8px;margin-bottom:8px;cursor:pointer;border:1.5px solid transparent;transition:all 0.2s">
      <div style="font-size:1.8rem">🏍️</div>
      <div style="flex:1">
        <div style="font-weight:600">${r.name}</div>
        <div style="font-size:.75rem;color:var(--muted)">⭐ ${r.rating || 'New'} · ${r.total_deliveries || 0} deliveries</div>
      </div>
      <div style="color:var(--green);font-size:0.9rem">Select →</div>
    </div>
  `).join('');
}


// Customer selects a rider
async function selectRider(orderId, riderPhone, el) {
   console.log('✅ selectRider called:', orderId, riderPhone);
  if (!confirm('Assign this rider to your order?')) return;
  
  if(el) el.innerHTML = '<span class="spin"></span> Assigning...';
  
  // ✅ FIXED: Correct route is /api/orders/:id/assign-rider with PUT method
  const res = await apiFetch(`/api/orders/${orderId}/assign-rider`, {
    method: 'PUT',  // ← Changed from POST to PUT
    body: { rider_phone: riderPhone }
  });
  
    if (res?.success) {
    toast('Rider notified! Waiting for response... 🚴', 'ok');
    renderTracking(orderId);
    // Customer waits — rider will chat back if interested
  } else {
    toast(res?.error || 'Failed. Try another rider .', 'err');
    loadAvailableRiders(orderId);
  }
}

let _foodRating=0;
let _riderRating=0; // global vars to store current ratings before submission

function setRating(type, stars){
    if(type==='food')_foodRating=stars;   
    if(type==='rider')_riderRating=stars;

    // Highlight stars up to the selected rating for both food and rider
    const container = document.getElementById(`${type}-stars`);
    if(!container) return;

 container.querySelectorAll('.star').forEach((s,i)=>{
  s.textContent = i<stars ? '⭐' : '☆';
 });

 // visual feedback: briefly scale up the selected stars
 const selectedStars = container.querySelectorAll('.star')[stars-1];
 if(selectedStars){
  selectedStars.style.transform = 'scale(1.4)';
  setTimeout(() => 
    selectedStars.style.transform = 'scale(1)', 200);
  
 }
}
async function submitRating(){
  // Check order type to determine if rider rating is required
  const o = await apiFetch(`/api/orders/${active0Id}`);
  const isPickup = o?.order_type === 'pickup' || o?.customer_area === 'KFC Narok (Self-pickup)';

  // Food rating is always required

    if(!_foodRating){
        toast('Please rate the food quality', 'err');
        return;
    }

    // Rider rating is required for delivery orders
    if(!isPickup && !_riderRating){
        toast('Please rate the rider service', 'err');
        return;
    }

    const btn = document.querySelector('#rating-card button');
    if(btn){ btn.innerHTML = '<span class="spin"></span> Submitting...'; btn.disabled = true; }

    const res = await apiFetch(`/api/orders/${active0Id}/rate`, {
        method: 'POST',
        body: {
            foodStars: _foodRating,
            riderStars: isPickup ? null : _riderRating
        }
    });

    if(res?.success){
        toast('⭐ Thanks for your rating!', 'ok');

        // mark order as rated to prevent multiple submissions (in case of re-render) 
        localStorage.setItem(`mb_rated_${active0Id}`, 'true');
        // Hide rating card after successful submission
        document.getElementById('rating-card')?.remove();
        // Reset
        _foodRating = 0;
        _riderRating = 0;
        renderTracking(active0Id); // re-render to show updated ratings
    }
      else {
        toast(res?.error || 'Failed to submit rating. Please try again.', 'err');
        if(btn){ btn.innerHTML = 'Submit Rating'; btn.disabled = false; }
    }
}     



// RIDER APP

async function launchRider(){
    screen('s-rider');
    startRiderRealtime(); // subscribe to dispatch broadcasts immediately

    // Restore active delivery if rider refreshes mid-delivery
    if(!riderState.activeOrder){
      const saved = localStorage.getItem('mb_active_delivery');
      if(saved){ try{ riderState.activeOrder=JSON.parse(saved); riderState.collected=false; }catch{} }
    }

    // Restore a pending (dispatched but not yet accepted) order
    // This is the order the rider missed while they were in another app
    if(!riderState.activeOrder && !riderState.pendingOrder){
      const pending = localStorage.getItem('mb_pending_order');
      if(pending){ try{ riderState.pendingOrder=JSON.parse(pending); }catch{} }
    }

    if(!riderState.name){
        riderState.regStep=0;
        renderRiderReg();
    } else {
        renderRiderHome();
        if(riderState.activeOrder){
          // Already on a delivery — go straight to delivery tab
          rPanel('delivery', document.querySelector('[data-s="delivery"]'));
        } else if(riderState.pendingOrder){
          // Missed a dispatch while away — show the order alert now
          requestAnimationFrame(() => showRiderOrderAlert(riderState.pendingOrder));
        }
        // Act on notification tap intent that survived a page reload
        if(window._pendingNotifIntent){
          const intent = window._pendingNotifIntent;
          window._pendingNotifIntent = null;
          setTimeout(() => {
            if(intent.action === 'openChat' && intent.orderId){
              openChat(intent.orderId, intent.role || 'rider');
            } else if(intent.action === 'showOrder' && riderState.pendingOrder){
              showRiderOrderAlert(riderState.pendingOrder);
            }
          }, 400); // brief delay ensures renderRiderHome DOM is ready
        }

    }
}

function rPanel(id,btn=null){
    if (btn){
        document.querySelectorAll('#s-rider .bnav-btn').forEach(b=>b.classList.remove('on')); btn.classList.add('on');
    }
    if (id==="home") renderRiderHome();
    else if (id==='delivery') renderRiderDelivery();
    else if (id==='earnings') renderRiderEarnings();
    }

    // REGISTRATION
    function renderRiderReg(){
        const steps=['Name','ID','Selfie'];
        const step=riderState.regStep;
        const rc=document.getElementById('rider-content');

        const stepsHTML=`<div class="reg-row">
        ${steps.map((s,i)=>`
            ${i>0?`<div class="reg-l${i<=step?' dn':''}"></div>`:''}
            <div class="reg-d${i<step?' dn':''} ${i===step?' act':''}">${i<step?'✓':i+1}</div>`).join('')}
  </div>`;

  if(step===0){
    rc.innerHTML=`<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">WELCOME, RIDER! 🏍️</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Earn at least KES 100 per delivery. Let's verify your identity.</p>
      <div class="card">
        <div class="field" style="margin-bottom:13px"><label class="field-lbl">Your Full Name</label><input class="inp" id="reg-name" placeholder="e.g. James Mutua" autocomplete="name"/></div>
        <button class="btn btn-primary btn-full" onclick="regNext()">Next: Upload ID →</button>
      </div>
    </div>`;
  } else if(step===1){
     rc.innerHTML=`<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">NATIONAL ID</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Upload a clear photo of your National ID (both sides visible)</p>
      <div class="upload-z${riderState.regData.idFile?' dn':''}" id="id-zone">
        <input type="file" accept="image/*" onchange="handleUpload(event,'id')"/>
        <div class="uz-ico">🪪</div>
        <div class="uz-name" id="id-fn">${riderState.regData.idFile?'✅ '+riderState.regData.idFile.name:'Tap to choose photo'}</div>
        <div class="uz-txt">JPG or PNG · Clear and readable</div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="regNext()">Next: Driving License →</button>
    </div>`;
  } else if(step===2){
    rc.innerHTML=`<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">DRIVING LICENSE</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Upload your valid Kenyan Driving License</p>
      <div class="upload-z${riderState.regData.licFile?' dn':''}" id="lic-zone">
        <input type="file" accept="image/*" onchange="handleUpload(event,'lic')"/>
        <div class="uz-ico">🚗</div>
        <div class="uz-name" id="lic-fn">${riderState.regData.licFile?'✅ '+riderState.regData.licFile.name:'Tap to choose photo'}</div>
        <div class="uz-txt">Must show license number and category</div>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="regNext()">Next: Selfie →</button>
    </div>`;
  } else if(step===3){
    rc.innerHTML=`<div style="padding:24px 16px;max-width:468px;margin:0 auto">
      ${stepsHTML}
      <div class="h3" style="letter-spacing:2px;margin-bottom:6px">YOUR SELFIE</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:22px">Take a clear photo of your face to confirm you are who your ID says.</p>
      <div class="upload-z${riderState.regData.selfieFile?' dn':''}" id="selfie-zone">
        <input type="file" accept="image/*" capture="user" onchange="handleUpload(event,'selfie')"/>
        <div class="uz-ico">🤳</div>
        <div class="uz-name" id="selfie-fn">${riderState.regData.selfieFile?'✅ '+riderState.regData.selfieFile.name:'Tap to take selfie'}</div>
        <div class="uz-txt">Good lighting · Face clearly visible</div>
      </div>

      <button class="btn btn-primary btn-full" style="margin-top:8px" onclick="startCamera()" id="cam-btn">📷 Use Camera Instead</button>
      <button class="btn btn-primary btn-full" style="display:none;margin-top:8px" onclick="takeSelfie()" id="snap-btn">📸 Take Photo</button>
      <button class="btn btn-ghost btn-full" style="display:none;margin-top:4px" onclick="stopCamera()" id="stop-cam-btn">✕ Cancel Camera</button>
      
      <button class="btn btn-primary btn-full" style="margin-top:13px" onclick="submitReg()">Submit Application ✓</button>
    </div>`;
  }
}

let cameraStream = null;

async function startCamera(){
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
        const video = document.getElementById('selfie-video');
        video.srcObject = cameraStream;
        video.style.display = 'block';
        document.getElementById('cam-btn').style.display = 'none';
        document.getElementById('snap-btn').style.display = 'block';
        document.getElementById('stop-cam-btn').style.display = 'block';
        document.getElementById('selfie-zone').style.display = 'none';
    } catch(e) {
        toast('Camera access denied. Please upload a photo instead.','err');
    }
}

function takeSelfie(){
    const video = document.getElementById('selfie-video');
    const canvas = document.getElementById('selfie-canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
        const file = new File([blob], 'selfie.jpg', {type:'image/jpeg'});
        riderState.regData.selfieFile = file;
        toast('Selfie captured! ✅','ok');
        stopCamera();
        const fn = document.getElementById('selfie-fn');
        if(fn) fn.textContent = '✅ selfie.jpg';
    }, 'image/jpeg', 0.9);
}

function stopCamera(){
    if(cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    const video = document.getElementById('selfie-video');
    if(video) video.style.display = 'none';
    const camBtn = document.getElementById('cam-btn');
    const snapBtn = document.getElementById('snap-btn');
    const stopBtn = document.getElementById('stop-cam-btn');
    if(camBtn) camBtn.style.display = 'block';
    if(snapBtn) snapBtn.style.display = 'none';
    if(stopBtn) stopBtn.style.display = 'none';
}

function handleUpload(e,type){
    const file=e.target.files[0]; if(!file) return;
    riderState.regData[`${type}File`]=file;
    const fn=document.getElementById(`${type}-fn`);
    if(fn) fn.textContent='✅ '+file.name;
    const zone=document.getElementById(`${type}-zone`);
    if(zone) zone.classList.add("dn");
}

function regNext(){
    const step=riderState.regStep;
    if(step===0){
        const name=document.getElementById('reg-name')?.value.trim();
        if(!name||name.length<3){ toast('Enter your full name','err'); return; }
        riderState.name=name;
    }
    if(step===1&&!riderState.regData.idFile){ toast('Please upload your National ID','err'); return; }
    if(step===2&&!riderState.regData.licFile){ toast('Please upload your Driving License','err'); return; }
    riderState.regStep++;
    renderRiderReg();
}

async function submitReg(){
    if(!riderState.regData.selfieFile){ toast('Please take a selfie','err'); return; }

    const phone = riderState.phone || user.phone;
    const name = riderState.name;

     // Upload documents to Supabase Storage
    const uploadFile = async (file, type) => {
        const ext = file.name.split('.').pop();
        const path = `${phone}/${type}.${ext}`;
        const { error } = await supa.storage
            .from('rider-docs')
            .upload(path, file, { upsert: true });
        if(error) console.error(`Upload ${type} error:`, error.message);
        return path;
    };

    toast('Uploading documents...', '', 8000);

    const [idPath, licPath, selfiePath] = await Promise.all([
        uploadFile(riderState.regData.idFile, 'national-id'),
        uploadFile(riderState.regData.licFile, 'license'),
        uploadFile(riderState.regData.selfieFile, 'selfie'),
    ]);

    // Save rider with document paths
     await apiFetch('/api/rider/register', {
        method: 'POST',
        body: { 
           phone, name, idPath, licPath, selfiePath
        }
    });

    document.getElementById('rider-content').innerHTML=`
    <div style="text-align:center;padding:80px 20px">
      <div style="font-size:4rem;margin-bottom:18px">⏳</div>
      <div class="h2" style="letter-spacing:2px;margin-bottom:8px">UNDER REVIEW</div>
      <p style="font-size:.87rem;color:var(--muted);margin-bottom:28px">Your documents are being verified. We'll notify you within 24 hours.</p>
      <div class="card" style="max-width:320px;margin:0 auto">
        <p style="font-size:.82rem;color:var(--muted)">Questions? Call us at</p>
        <p style="font-family:var(--fh);font-size:1.2rem;letter-spacing:1px;margin-top:4px">0702 923 826</p>
      </div>
    </div>`;
  toast('Application submitted! Under review 📋','ok',5000);
}

// RIDER DASHBOARD
function renderRiderHome(){
    const rc=document.getElementById('rider-content');
    rc.innerHTML=`
    <div style="padding:14px 16px 100px">
      <div class="r-prof">
        <div class="r-av">🏍️</div>
        <div>
          <div class="r-name">${riderState.name||'Rider'}</div>
          <div class="r-meta">⭐ ${riderState.rating} · ${riderState.deliveries} total deliveries</div>
        </div>
      </div>
      <div id="r-alert-zone"></div>
      <div class="toggle-c">
        <div><div class="tg-lbl" id="tg-lbl">${riderState.online?'🟢 ONLINE':'Go Online'}</div><div class="tg-sub">${riderState.online?'Receiving orders':'Tap to start receiving orders'}</div></div>
        <div class="tg-sw${riderState.online?' on':''}" id="tg-sw" onclick="toggleOnline()"></div>
      </div>
      <div class="stats2">
        <div class="sm"><div class="sm-v" id="r-trips">${riderState.todayTrips}</div><div class="sm-l">Today's Trips</div></div>
        <div class="sm"><div class="sm-v" id="r-earn">KES ${riderState.todayEarnings||0}</div><div class="sm-l">Today's Earnings</div></div>
        <div class="sm"><div class="sm-v">${riderState.deliveries}</div><div class="sm-l">Total Trips</div></div>
        <div class="sm"><div class="sm-v" style="color:var(--green)">${riderState.rating}</div><div class="sm-l">Rating</div></div>
      </div>
    </div>`;
    if(riderState.activeOrder) showRiderOrderAlert(riderState.activeOrder);
}

function toggleOnline(){
    riderState.online=!riderState.online;
    const sw=document.getElementById('tg-sw'), lbl=document.getElementById('tg-lbl');
    if(sw) sw.classList.toggle('on',riderState.online);
    if(lbl){ lbl.nextElementSibling.textContent=riderState.online?'Receiving orders':'Tap to start receiving orders'; lbl.textContent=riderState.online?'🟢 ONLINE':'Go online'; }
    apiFetch('/api/rider/availability',{method:'POST',body:{available:riderState.online}});
    // Persist online state — restored on page reload so rider doesn't go dark unexpectedly
    try { const rd = JSON.parse(localStorage.getItem('mb_rider')||'{}'); rd.online = riderState.online; localStorage.setItem('mb_rider', JSON.stringify(rd)); } catch{}
    toast(riderState.online?'You are now ONLINE 🟢':'You are now offline');
    if(riderState.online) startLocTracking();
    // rider has toggled themselves online and does not currently have an active order. && = both must be true
}

function showRiderOrderAlert(o){
    const z=document.getElementById('r-alert-zone');
    if(!z) return;
    let t=180;

    // FIX 1: Store the FULL payload object in activeOrder immediately.
    // Previously only pendingOrder was set here — but openPreAcceptChat() and
    // acceptOrder() both read from activeOrder. If activeOrder was only {id:orderId}
    // (set by openPreAcceptChat's stub), all fields like order_number, customer_area,
    // delivery_hint, items became undefined in the delivery screen.
    riderState.activeOrder  = o;
    riderState.pendingOrder = o;

  // Prefer top-level lat/lng (set by dispatch.js) over nested location object
    const lat = o.customer_lat || o.location?.lat;
    const lng = o.customer_lng || o.location?.lng;

    // Build delivery hint — area + landmark combined
    // FIX 3: Use delivery_hint from backend if present (already has "Area — Landmark").
    // If not, build it here. Either way use ONE variable — don't show it twice.
    const delivHint = o.delivery_hint
      || (o.landmark ? `${o.customer_area||'Narok Town'} — ${o.landmark}` : null)
      || o.customer_area
      || 'Narok Town';

    // OpenStreetMap location preview — no API key needed
    const mapHtml = (lat && lng) ? `
      <div style="margin:10px 0;border-radius:10px;overflow:hidden;height:155px;position:relative;border:1px solid var(--line2)">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=${(lng-0.012).toFixed(6)},${(lat-0.012).toFixed(6)},${(lng+0.012).toFixed(6)},${(lat+0.012).toFixed(6)}&layer=mapnik&marker=${lat},${lng}"
          style="width:100%;height:100%;border:0;pointer-events:none" loading="lazy">
        </iframe>
        <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,.65);padding:3px 7px;font-size:.68rem;border-radius:4px 0 0 0;color:#fff">
          📍 Customer location
        </div>
      </div>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving"
         target="_blank"
         style="display:block;background:#1565c0;color:#fff;text-align:center;padding:9px;border-radius:8px;text-decoration:none;font-size:.82rem;font-weight:600;margin:4px 0">
        🗺️ Open Navigation (Google Maps)
      </a>` : '';

         // delivHint already built above — don't rebuild here

    z.innerHTML=`<div class="o-alert">
    <div class="oa-top"><div class="oa-title">🔔 NEW ORDER!</div><div class="oa-timer" id="ot">${fmtTime(t)}</div></div>
    <div class="oa-detail">📍 Collect from: <strong>KFC Narok</strong></div>
    <div class="oa-detail">🏠 Deliver to: <strong>${delivHint}</strong></div>
    <div class="oa-detail" style="color:var(--green);font-weight:700;font-size:.92rem">💰 Delivery Fee: KES ${o.delivery_fee > 0 ? o.delivery_fee : '—  (agree via chat)'}</div>
    ${mapHtml}
    <div class="oa-items" style="margin-top:8px">${(o.items||[]).map(i=>`• ${i.name}${i.note?` (${i.note})`:''}`).join('<br>')}</div>
    <button class="btn btn-ghost btn-full" style="margin-top:10px" onclick="openPreAcceptChat(${o.id})">💬 Chat with Customer First</button>
    <div class="oa-btns"><button class="btn-accept" onclick="acceptOrder()">✅ ACCEPT</button><button class="btn-decline" onclick="declineOrder()">Pass</button></div>
     </div>`;

    // Subscribe to chat for this order BEFORE accepting
  supa.channel('order-chat-'+o.id)
    .on('broadcast',{event:'msg'},({payload})=>{
      if(chatOrderId !== o.id){
        toast(`💬 Customer: ${payload.text.substring(0,30)}...`,'ok',5000);
        playBeep();
      }
    })
    .subscribe();

    if(oTimer) clearInterval(oTimer);
    oTimer=setInterval(()=>{ t--; const el=document.getElementById('ot'); if(el)el.textContent=fmtTime(t); if(t<=0){clearInterval(oTimer);z.innerHTML='';riderState.activeOrder=null;toast('0rder expired - no response in time','warn');} },1000);
}

function openPreAcceptChat(orderId){
  // Don't overwrite the full activeOrder object with a stub {id:orderId}
  // riderState.activeOrder is already the full payload set by showRiderOrderAlert()
  openChat(orderId, 'rider');
}

function fmtTime(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

function acceptOrder(){
  if(oTimer) clearInterval(oTimer);
  // activeOrder is already the full order object (set in showRiderOrderAlert).
  // pendingOrder is the same object — just clear it.
  riderState.pendingOrder = null;
  localStorage.removeItem('mb_pending_order');

  // FIX 2: Update status in local object immediately so renderRiderDelivery shows
  // the "Food Collected" button instead of "Awaiting payment confirmation".
  // The backend /accept endpoint updates the DB — we mirror that locally right away.
  if(riderState.activeOrder) riderState.activeOrder.status = 'rider_assigned';

  apiFetch(`/api/orders/${riderState.activeOrder.id}/accept`, {method:'POST'});
  localStorage.setItem('mb_active_delivery', JSON.stringify(riderState.activeOrder));

  // Listen for chat on this order
  const orderId = riderState.activeOrder.id;
  startRiderChatListener(orderId);

  toast('Order accepted! Head to KFC Narok 🏍️','ok');
  const alertZone = document.getElementById('r-alert-zone');
  if(alertZone) alertZone.innerHTML='';
  riderState.collected=false;
  rPanel('delivery', document.querySelector('[data-s="delivery"]'));
}

function declineOrder(){
  if(oTimer) clearInterval(oTimer);
  const alertZone = document.getElementById('r-alert-zone');
  if(alertZone) alertZone.innerHTML='';
  if(riderState.activeOrder?.id){
    apiFetch(`/api/orders/${riderState.activeOrder.id}/decline`, {method:'POST'});
  }
  riderState.activeOrder  = null;
  riderState.pendingOrder = null;
  localStorage.removeItem('mb_pending_order');
  toast('Order passed');
} 

function renderRiderDelivery(){
    const rc=document.getElementById('rider-content');
    const o=riderState.activeOrder;
    if(!o){
        rc.innerHTML=`<div class="empty" style="padding-top:80px"><div class="ei">🏍️</div><h3>NO ACTIVE DELIVERY</h3><p>Go online to receive orders</p></div>`; return;
    }
    rc.innerHTML=`<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="width:7px;height:7px;background:var(--red);border-radius:50%;animation:blink 1s infinite"></span>
        <span style="font-size:.7rem;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.08em">Active Delivery · ${o.order_number}</span>
      </div>
      <div class="receipt">
        <div class="receipt-hdr">🧾 KFC NAROK COLLECTION RECEIPT</div>
        <div>Order: <strong>${o.order_number}</strong></div>
         ${(o.items||[]).map(i=>`<div>• ${i.name}${i.chickenType?` <strong style="color:var(--red)">[${i.chickenType}]</strong>`:''}${i.note?` <span style="color:var(--orange)">(${escapeHtml(i.note)})</span>`:''}</div>`).join('')}
        <div class="receipt-note">Show this screen to KFC staff at the counter</div>
      </div>
      <div style="background:var(--dark3);border-radius:var(--r);padding:12px;margin-bottom:12px;font-size:.85rem">
        📍 Deliver to: <strong>${o.delivery_hint || [o.customer_area, o.landmark].filter(Boolean).join(' — ') || o.customer_area}</strong><br>
        💰 Delivery fee: <strong style="color:var(--green)">${riderState.agreedFee ? `KES ${riderState.agreedFee} (agreed)` : 'Agree with customer'}</strong> - collect cash at door
      </div>

      ${(o.location?.lat || o.customer_lat) ? `
      <div style="background:var(--dark3);border-radius:var(--r);padding:12px;margin-bottom:12px">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:8px;font-weight:600;letter-spacing:.5px">📍 CUSTOMER LOCATION</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${o.location?.lat||o.customer_lat},${o.location?.lng||o.customer_lng}"
             target="_blank"
             style="flex:1;background:var(--red);color:#fff;text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.85rem">
            🗺️ Navigate (Google Maps)
          </a>
          <a href="https://maps.apple.com/?daddr=${o.location?.lat||o.customer_lat},${o.location?.lng||o.customer_lng}&dirflg=d"
             target="_blank"
             style="flex:1;background:var(--dark2);color:var(--white);text-align:center;padding:10px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.85rem;border:1px solid var(--line2)">
            🍎 Apple Maps
          </a>
        </div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:6px;text-align:center">
          ${(o.location?.lat||o.customer_lat).toFixed(5)}, ${(o.location?.lng||o.customer_lng).toFixed(5)}
        </div>
      </div>
      ` : `
      <div style="background:var(--dark3);border-radius:var(--r);padding:10px 12px;margin-bottom:12px;font-size:.8rem;color:var(--orange)">
        ⚠️ No GPS coordinates — ask customer for their exact location via chat
      </div>
      `}
    
    ${riderState.collected
  ? `<button class="btn btn-primary btn-full" onclick="showPin()">🔐 Enter Customer PIN</button>`
  : riderState.activeOrder?.status === 'paid' || riderState.activeOrder?.status === 'rider_assigned'
    ? `<button class="btn btn-green btn-full" onclick="markCollected()">✅ Food Collected — Start Delivery</button>`
    : `<div style="text-align:center;padding:10px;color:var(--orange);font-size:.85rem">⏳ Awaiting payment confirmation from admin</div>`
}
    </div>
  </div>`;
}
function markCollected(){
    riderState.collected=true;
    toast('Great! Now deliver to the customer 🏍️','ok');
    renderRiderDelivery();
    apiFetch(`/api/orders/${riderState.activeOrder?.id}/collected`,{method:'POST'});
}

 function showPin(){
    pinBuf='';
    const rc=document.getElementById('rider-content');
    rc.innerHTML=`<div style="padding:24px 16px 100px;max-width:468px;margin:0 auto;text-align:center">
    <div style="font-size:2.5rem;margin-bottom:12px">🔐</div>
    <div class="h2" style="letter-spacing:2px;margin-bottom:6px">DELIVERY PIN</div>
    <p style="font-size:.87rem;color:var(--muted);margin-bottom:0">Ask for the 4-digit PIN <strong>after</strong> handing over the food</p>
    <div class="pin-disp">
      <div class="pc" id="p0">_</div><div class="pc" id="p1">_</div>
      <div class="pc" id="p2">_</div><div class="pc" id="p3">_</div>
    </div>
    <div class="numpad">
      ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k=>`
        <button class="nk ${k===''?'em':''} ${k==='⌫'?'bk':''}"
          onclick="${k==='⌫'?'pinDel()':k!==''?`pinTap(${k})`:''}">
          ${k}
        </button>`).join('')}
    </div>
  </div>`;
  updatePinDisplay();
 }  

 function pinTap(n){ if(pinBuf.length<4){pinBuf+=n; updatePinDisplay(); if(pinBuf.length===4)setTimeout(confirmPin,300);} }
 function pinDel(){ pinBuf=pinBuf.slice(0,-1); updatePinDisplay(); }
                                                    // Four boxes displayed for the pin                                 // visual displays dot for pin and dash when empty
 function updatePinDisplay(){ for(let i=0;i<4;i++){const el=document.getElementById(`p${i}`); if(el){el.textContent=pinBuf[i]?'●':'_'; el.classList.toggle('f',!!pinBuf[i]); el.classList.remove('err');}} }

 async function confirmPin() {
    const r=await apiFetch(`/api/orders/${riderState.activeOrder?.id}/confirm-pin`,{method:'POST',body:{pin:pinBuf}});
    if(r){
    // Calculate earnings from agreed fee or order delivery_fee
    const agreedFee = riderState.agreedFee
      || parseInt(localStorage.getItem('mb_agreed_fee'))
      || riderState.activeOrder?.delivery_fee
      || 0;

    riderState.activeOrder=null; riderState.collected=false;
    riderState.todayTrips++; riderState.deliveries++;
    riderState.todayEarnings = (riderState.todayEarnings || 0) + agreedFee;
    riderState.agreedFee = 0;
    localStorage.removeItem('mb_agreed_fee');

    document.querySelectorAll('#s-rider .bnav-btn').forEach(b=>b.classList.toggle('on',b.dataset.s==='home'));
    renderRiderHome();
    toast(`🎉 PIN correct! Delivery complete${agreedFee ? ` · KES ${agreedFee} earned` : ''}. Collect cash from customer.`,'ok',6000);
    localStorage.removeItem('mb_active_delivery');
    localStorage.removeItem('mb_chat_'+riderState.activeOrder?.id);
  } else {
    for(let i=0;i<4;i++){const el=document.getElementById(`p${i}`); if(el)el.classList.add('err');}
    pinBuf=''; setTimeout(updatePinDisplay,600);
    toast('Wrong PIN. Ask customer to check their SMS.','err');
    }   
 }

 async function renderRiderEarnings(){
  const rc=document.getElementById('rider-content');
  rc.innerHTML=`<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div style="text-align:center;padding:20px 0 8px"><span class="spin"></span></div>
  </div>`;

  const phone = riderState.phone || user.phone;
  const data = await apiFetch('/api/rider/earnings') || {};

  const todayEarnings   = data.today_earnings   ?? riderState.todayEarnings ?? 0;
  const todayDeliveries = data.today_deliveries ?? riderState.todayTrips    ?? 0;
  const totalEarnings   = data.total_earnings   ?? 0;
  const totalDeliveries = data.total_deliveries ?? riderState.deliveries   ?? 0;
  const history         = data.history          ?? [];

  const historyHTML = history.length
    ? history.map(day => {
        const dateLabel = (() => {
          const today = new Date().toISOString().slice(0,10);
          const yest  = new Date(Date.now()-86400000).toISOString().slice(0,10);
          if(day.date===today) return 'Today';
          if(day.date===yest)  return 'Yesterday';
          const d = new Date(day.date+'T00:00:00');
          return d.toLocaleDateString('en-KE',{weekday:'short',month:'short',day:'numeric'});
        })();
        return `
        <div style="background:var(--dark3);border-radius:10px;padding:14px;margin-bottom:9px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:.92rem">${dateLabel}</span>
            <span style="font-family:var(--fh);color:var(--green);font-size:1.1rem;letter-spacing:1px">KES ${day.earnings.toLocaleString()}</span>
          </div>
          <div style="font-size:.77rem;color:var(--muted);margin-bottom:8px">${day.deliveries} deliver${day.deliveries===1?'y':'ies'}</div>
          ${(day.orders||[]).map(o=>`
            <div style="display:flex;justify-content:space-between;font-size:.76rem;padding:4px 0;border-top:1px solid var(--line)">
              <span style="color:var(--muted)">#${o.order_number} · ${o.customer_area||''}</span>
              <span style="font-weight:700">KES ${(o.delivery_fee||0).toLocaleString()}</span>
            </div>`).join('')}
        </div>`}).join('')
    : `<div style="text-align:center;padding:30px;color:var(--muted);font-size:.85rem">No deliveries yet${data.history_cleared_at?' since last clear':''}</div>`;

  rc.innerHTML=`<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <!-- Today summary -->
    <div class="card">
      <div class="card-t">TODAY</div>
      <div style="text-align:center;padding:12px 0">
        <div style="font-family:var(--fh);font-size:3rem;color:var(--green);letter-spacing:2px">KES ${todayEarnings.toLocaleString()}</div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px">${todayDeliveries} deliver${todayDeliveries===1?'y':'ies'} today</div>
      </div>
    </div>
    <!-- All-time totals -->
    <div class="card" style="margin-top:10px">
      <div class="card-t">ALL-TIME TOTALS${data.history_cleared_at ? ` <span style="font-size:.68rem;color:var(--muted);font-family:var(--fb)">(since ${new Date(data.history_cleared_at).toLocaleDateString('en-KE')})</span>` : ''}</div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
        <span style="color:var(--muted)">Total earned</span>
        <span style="font-family:var(--fh);color:var(--green);font-size:1rem">KES ${totalEarnings.toLocaleString()}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-bottom:1px solid var(--line)">
        <span style="color:var(--muted)">Total deliveries</span>
        <span style="font-weight:700">${totalDeliveries}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem">
        <span style="color:var(--muted)">Average rating</span>
        <span style="color:var(--green)">⭐ ${riderState.rating || 'N/A'}</span>
      </div>
    </div>
    <!-- Earnings history -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px">
      <div style="font-size:.8rem;font-weight:700;letter-spacing:1px;color:var(--muted)">EARNINGS HISTORY</div>
      ${history.length ? `<button onclick="clearEarningsHistory()"
        style="background:transparent;border:1px solid var(--line2);color:var(--muted);
               padding:5px 12px;border-radius:8px;font-size:.74rem;cursor:pointer">
        🗑 Clear History
      </button>` : ''}
    </div>
    ${historyHTML}
    <div class="card" style="margin-top:11px">
      <div class="card-t">TIPS TO EARN MORE</div>
      <div style="font-size:.84rem;color:var(--muted);line-height:1.85">
        • Stay online during peak hours (12–2pm, 6–9pm)<br>
        • Maintain 4.5+ rating for priority assignments<br>
        • Confirm PINs promptly for good customer reviews<br>
        • Be professional — customers rate higher when you are
      </div>
    </div>
  </div>`;
}

async function clearEarningsHistory(){
  if(!confirm('Clear your earnings history display?\n\nYour delivery records are kept safely — only the display counter resets.')) return;
  const res = await apiFetch('/api/rider/earnings/clear', {method:'DELETE'});
  if(res?.success){
    toast('✅ Earnings history cleared','ok');
    riderState.todayEarnings = 0;
    riderState.todayTrips = 0;
    renderRiderEarnings();
  } else {
    toast('Could not clear history','err');
  }
}

function startLocTracking(){
  if(!navigator.geolocation) return;
  if(_locInterval) clearInterval(_locInterval); // FIX: clear existing interval before creating new one
 
  // adapting the tracking interval based on rider's online status and active order
  const interval = riderState.activeOrder ? 30000 : 300000; //30s when active order, 5min otherwise
  _locInterval = setInterval(() => {
    // only track if rider is online and has an active order (optional: could track more frequently when active order)
    if (!riderState.online && !riderState.activeOrder) return; // don't track if offline
    navigator.geolocation.getCurrentPosition(pos => {
      apiFetch('/api/rider/location', {
        method: 'POST',
        body: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString()
        }
      });
    }, err => console.warn('GPS error:', err), { enableHighAccuracy: !!riderState.activeOrder } // high accuracy when active order, otherwise save battery
      );
  }, interval);

  // call when state changes to adjust tracking frequency immediately
  function toggleOnline(){
    riderState.online=!riderState.online;
    // restart tracking with new interval immediately on status change
    startLocTracking();
  }

}


// KITCHEN APP
let kInterval=null;
let _locInterval=null;
let _clockInterval=null; // FIX: track location interval so it can be cleared on re-toggle
let trackInterval=null;  // FIX: customer order tracking poll interval — cleared on exitRole

function launchKitchen(){
  screen('s-kitchen');
  startClock();
  kOrders=[];
  if(kInterval) clearInterval(kInterval);
  pollKitchen();
  kInterval=setInterval(pollKitchen,8000);
  startKitchenRealtime(); // FIX: start realtime so new orders appear and beep instantly
}

function startClock(){
  if(_clockInterval){ clearInterval(_clockInterval); _clockInterval=null; }
  const tick=()=>{
    const el=document.getElementById('k-clock');
    if(el) el.textContent=new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Africa/Nairobi'});
  };
  tick(); _clockInterval=setInterval(tick,1000);
}

async function pollKitchen(){
  const data=await apiFetch('/api/kitchen/orders');
  if(data?.orders){ kOrders=data.orders; renderKitchen(); } 
} //check data is not null, then access orders //updates the global KOrders with fresh orders from backend  // Redraws the entire kitchen board with updated orders,any status change will reflect immediately.

function renderKitchen(){
  const pending = kOrders.filter(o=>o.status==='pending');
  const nw = kOrders.filter(o=>['pending','paid'].includes(o.status));
  const co = kOrders.filter(o=>o.status==='cooking');
  const rd = kOrders.filter(o=>['ready','rider_assigned'].includes(o.status));

  document.getElementById('ks-new').textContent=nw.length;
  document.getElementById('ks-cook').textContent=co.length;
  document.getElementById('ks-rdy').textContent=rd.length;
  document.getElementById('ks-done').textContent=kDone;
  document.getElementById('kc-n').textContent=nw.length;
  document.getElementById('kc-c').textContent=co.length;
  document.getElementById('kc-r').textContent=rd.length;
  document.getElementById('kb-new').innerHTML=nw.length
    ?nw.map(o=>kCard(o,'new')).join('')
    :'<div class="empty"><div class="ei" style="font-size:2rem">🍗</div><h3 style="font-size:.85rem">NO NEW ORDERS</h3></div>';
  document.getElementById('kb-cook').innerHTML=co.length
    ?co.map(o=>kCard(o,'cook')).join('')
    :'<div class="empty"><div class="ei" style="font-size:2rem">🔥</div><h3 style="font-size:.85rem">NOTHING COOKING</h3></div>';
  document.getElementById('kb-rdy').innerHTML=rd.length
    ?rd.map(o=>kCard(o,'rdy')).join('')
    :'<div class="empty"><div class="ei" style="font-size:2rem">📦</div><h3 style="font-size:.85rem">NONE READY</h3></div>';
}
function kCard(o,type){
  const baseTime = o.paid_at || o.created_at;
  const ageMins = Math.floor((Date.now()-new Date(baseTime))/60000);
  const urgent = ageMins>15 && type!=='rdy';
  const isPickup = o.order_type === 'pickup' || o.customer_area === 'KFC Narok (Self-pickup)';
  const typePill = isPickup
    ? `<span style="background:#1a7a1a;color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle">🚶 SELF-PICKUP</span>`
    : `<span style="background:#1a3a7a;color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle">🛵 DELIVERY</span>`;
  const locationLine = isPickup
    ? `<div class="kc-area">🚶 Counter collection</div>`
    : `<div class="kc-area">📍 ${o.customer_area||'Narok'}</div>`;
  const rdyAction = isPickup
    ? `<div class="kb wait" style="background:var(--green);color:#fff">🚶 Ready for Collection</div>`
    : (o.status==='rider_assigned'
        ? `<div class="kb wait">🏍️ Rider Assigned</div>`
        : `<div class="kb wait">⏳ Awaiting Rider</div><button class="kb cook" style="margin-top:6px;font-size:.75rem" onclick="kRedispatch(${o.id})">🔄 Re-dispatch</button>`);
  const action = {
    new: o.status==='pending'
      ? `<div style="font-size:.7rem;color:var(--orange);margin-bottom:6px">⏳ AWAITING PAYMENT</div>
         <button class="kb cook" disabled style="opacity:.4;cursor:not-allowed">🔥 Start Cooking</button>`
      : `<div style="font-size:.7rem;color:var(--green);margin-bottom:6px">✅ PAID — Ready to cook</div>
         <button class="kb cook" onclick="kUpdate(${o.id},'cooking')">🔥 Start Cooking</button>`,
    cook: `<button class="kb rdy" onclick="kUpdate(${o.id},'ready')">✅ Mark Ready</button>`,
    rdy:  `<div>${rdyAction}</div>`
  }[type];
  return `<div class="kc" id="kc-${o.id}">
    <div class="kc-top"><div class="kc-num">${o.order_number}${typePill}</div><div class="kc-age${urgent?' urg':''}">⏱ ${ageMins}m</div></div>
    <div class="kc-items">${(o.items||[]).map(i=>`<div class="kc-item">${i.name}${i.chickenType?`<span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:5px">${i.chickenType}</span>`:''} ${i.note?`<div class="kc-note">⚠️ ${i.note}</div>`:''}</div>`).join('')}</div>
    ${locationLine}
    ${o.mpesa_reference
      ? `<div style="font-size:.72rem;color:var(--green);font-weight:600;margin-top:4px">💳 ${o.mpesa_reference}</div>`
      : '<div style="font-size:.72rem;color:var(--orange);margin-top:4px">⏳ Awaiting payment proof</div>'}
    <div class="kc-acts">${action}</div>
  </div>`;
}
async function kUpdate(id,status){
  // Optimistic update
  const o=kOrders.find(x=>x.id===id);
  if(o){ o.status=status; if(status==='ready')kDone++; renderKitchen(); }
  await apiFetch(`/api/kitchen/orders/${id}/status`,{method:'POST',body:{status}});
  if(status==='ready') toast('Order ready! Notifying rider 🏍️','ok');
  playBeep();
}

async function kRedispatch(id){
  toast('Re-dispatching to available riders...','ok',3000);
  const r = await apiFetch(`/api/kitchen/orders/${id}/status`,{method:'POST',body:{status:'ready'}});
  if(r?.success) toast('Re-dispatched! ✅','ok');
  else toast('Re-dispatch failed — try again','err');
  await pollKitchen();
}

function playBeep(){
  try {
    const ctx=new AudioContext(); // creates an audio env. in the browser.
    const osc=ctx.createOscillator(); // creates an oscillator - the thing that actually generates the sound wave.
    const g=ctx.createGain();   // controls the volume
    osc.connect(g); g.connect(ctx.destination); // connects everything in a chain: oscillator, gain, speakers.
    osc.frequency.value=660; osc.type='sine';  // set the pitch to 660Hz, sets wave shape to sine, the smoothest, cleanest tone
    g.gain.setValueAtTime(.25,ctx.currentTime); // sets starting volume to 25% of max,
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15); // fades the volume from 25% down to almost zero over 0.15 sec.
    osc.start(); osc.stop(ctx.currentTime+.15); // starts playing immediately and stops after 0.15 sec, very short and sharp notification sound.
  }catch{}
}


// ADMIN APP
function launchAdmin(){
  screen('s-admin');
  renderAdminOverview();

  // Subscribe to both INSERT (new orders) and UPDATE (status changes)
  supa.channel('admin-orders-watch').unsubscribe().catch(()=>{});
  supa.channel('admin-orders-watch')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},()=>{
      if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
      renderAdminOverview();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},()=>{
      if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
      renderAdminOverview();
    })
    .subscribe();

  // 20-second polling fallback for when Realtime blips
  if(window._adminPollTimer) clearInterval(window._adminPollTimer);
  window._adminPollTimer = setInterval(()=>{
    if(document.getElementById('ap-orders')?.classList.contains('on')) renderAdminOrders();
    renderAdminOverview();
  }, 20000);
}

function aTab(id,btn){
  document.querySelectorAll('#s-admin .sp').forEach(p=>p.classList.remove('on'));
  document.getElementById(`ap-${id}`)?.classList.add('on');
  if(btn){ document.querySelectorAll('.a-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
  if(id==='overview') renderAdminOverview();
  else if(id==='orders') renderAdminOrders();
  else if(id==='riders') renderAdminRiders();
  else if(id==='menu') renderAdminMenu();
  else if(id==='revenue') renderAdminRevenue();
}

async function renderAdminOverview() {
  const stats=await apiFetch('/api/admin/stats')||null;
  const active=DEMO_ORDERS_A.filter(o=>!['delivered','cancelled'].includes(o.status)).length;
  const done=DEMO_ORDERS_A.filter(o=>o.status==='delivered').length;
  document.getElementById('a-metrics').innerHTML=`
   <div class="a-mc"><div class="a-mc-ico">📦</div><div class="a-mc-v" style="color:var(--red)">${stats?.active_orders||active}</div><div class="a-mc-l">Active Orders</div></div>
    <div class="a-mc"><div class="a-mc-ico">✅</div><div class="a-mc-v">${stats?.delivered_today||done}</div><div class="a-mc-l">Done Today</div></div>
    <div class="a-mc"><div class="a-mc-ico">💰</div><div class="a-mc-v" style="color:var(--green)">KES ${(stats?.revenue_today||(done*580)).toLocaleString()}</div><div class="a-mc-l">Revenue Today</div></div>
    <div class="a-mc"><div class="a-mc-ico">🏍️</div><div class="a-mc-v">${stats?.online_riders||2}</div><div class="a-mc-l">Online Riders</div></div>`;
  // FIX: fetch real recent orders from the API — DEMO_ORDERS_A is always empty
  const recentData = await apiFetch('/api/admin/orders');
  const recent = (recentData?.orders || []).slice(0, 5);
  document.getElementById('a-recent').innerHTML = recent.length
    ? recent.map(o=>orderRow(o, true)).join('')
    : '<div class="empty"><div class="ei">📦</div><h3>NO RECENT ORDERS</h3></div>';
}

async function renderAdminOrders(page=1) {
  const data=await apiFetch(`/api/admin/orders?page=${page}&limit=20`);

  if(data.pagination?.totalPages > 1){
  document.getElementById('a-orders').innerHTML +=`
  <div style=display:flex;justify-content:center;gap:8px;margin-top:16px>
  <button ${!data.pagination?.hasPrev ? 'disabled' : ''} onclick="renderAdminOrders(${page-1})" class="btn btn-ghost">← Prev</button>
  <span>Page ${page} of ${data.pagination.totalPages}</span>
  <button ${!data.pagination?.hasNext ? 'disabled' : ''} onclick="renderAdminOrders(${page+1})" class="btn btn-ghost">Next →</button>
  </div>`;
  }

  const orders=data.orders||[];
  document.getElementById('a-orders').innerHTML=orders.length
    ? orders.map(o=>orderRow(o)).join('')
    : '<div class="empty"><div class="ei">📦</div><h3>NO ORDERS FOUND</h3></div>';
}


function orderRow(o){
  const items=(o.items||[]).slice(0,2).map(i=>i.name).join(', ')+(o.items?.length>2?'…':'');
  const isPickup = o.order_type === 'pickup';
  const typeBadge = isPickup
    ? `<span style="background:#1a3a2a;color:#4ade80;border:1px solid #4ade80;font-size:.65rem;
        font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.5px;margin-left:6px;
        vertical-align:middle">🏃 SELF-PICKUP</span>`
    : `<span style="background:#1a1a3a;color:#60a5fa;border:1px solid #60a5fa;font-size:.65rem;
        font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.5px;margin-left:6px;
        vertical-align:middle">🛵 DELIVERY</span>`;
  return `<div class="o-row">
    <div class="or-l">
      <div class="or-num">${o.order_number}${typeBadge}</div>
      <div class="or-m">${o.customer_name ? o.customer_name+' · ': ''}${items} · ${o.customer_area||'Narok'} · ${F.date(o.created_at)}</div>
      ${o.mpesa_reference
        ? `<div style="font-size:.72rem;color:var(--green);font-weight:600;margin-top:3px">💳 ${o.mpesa_reference}</div>`
        : `<div style="font-size:.72rem;color:var(--orange);margin-top:3px">⏳ No payment proof</div>`
      }${o.rider_phone
  ? `<div style="font-size:.72rem;color:var(--blue);margin-top:2px">🏍️ ${o.rider_name||o.rider_phone}</div>`
  : ''}
      </div>
    <div class="or-r">
      <div class="or-p">${F.money(o.food_amount)}</div>
      <span class="badge ${F.badge(o.status)}" style="margin-top:3px">${F.status(o.status)}</span>
      ${!['paid','cooking','ready','delivered','cancelled'].includes(o.status) ? `
  <button class="btn btn-ghost btn-sm" style="margin-top:6px;color:var(--green);font-size:.75rem" 
    onclick="markOrderPaid('${o.order_number}','${o.id}','${o.order_type||'delivery'}')">✅ Mark as Paid</button>` : ''}
    </div>
  </div>`;
}


async function markOrderPaid(num, id, orderType) {
  if(!confirm(`Confirm payment received for ${num}?`)) return;
  const result = await apiFetch(`/api/admin/orders/${id}/mark-paid`, {method:'POST'});
  if(result?.success){
    const isPickup = result.isPickup || orderType === 'pickup';
    showPinOnceModal(num, result.pin, isPickup);
    await renderAdminOrders();
  } else {
    toast(`Could not mark ${num} as paid — try again`, 'err');
  }
}

function showPinOnceModal(orderNum, pin, isPickup){
  // Remove any existing modal
  document.getElementById('pin-once-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend',`
    <div id="pin-once-modal" style="
      position:fixed;inset:0;background:rgba(0,0,0,.75);
      display:flex;align-items:center;justify-content:center;z-index:3000">
      <div style="
        background:var(--dark2);border-radius:18px;padding:28px 24px;
        max-width:340px;width:92%;text-align:center;border:1px solid var(--line2)">
        <div style="font-size:2.5rem;margin-bottom:8px">${isPickup ? '🏃' : '✅'}</div>
        <div style="font-family:var(--fh);font-size:1.1rem;letter-spacing:2px;margin-bottom:4px">${isPickup ? 'PICKUP ORDER — PAYMENT CONFIRMED' : 'ORDER MARKED AS PAID'}</div>
        <div style="font-size:.82rem;color:var(--muted);margin-bottom:20px">Order: <strong style="color:var(--white)">${orderNum}</strong></div>
        <div style="background:var(--dark3);border:2px solid var(--red);border-radius:12px;padding:18px;margin-bottom:16px">
          <div style="font-size:.72rem;color:var(--muted);letter-spacing:1px;margin-bottom:6px">🏃 SELF-PICKUP ORDER</div>
          <div style="font-size:.84rem;color:var(--white);line-height:1.5">
            Customer will collect at the counter.<br>
            Kitchen has been notified to prepare this order.
          </div>
          <div style="font-family:var(--fh);font-size:3rem;letter-spacing:12px;color:var(--red)">${pin}</div>
          <div style="font-size:.73rem;color:var(--muted);margin-top:8px">Sent to customer via SMS</div>
        </div>
        <div style="font-size:.75rem;color:var(--orange);margin-bottom:18px">
          ⚠️ This PIN will <strong>not</strong> be shown again. The customer received it by SMS.
        </div>
        <button onclick="document.getElementById('pin-once-modal').remove()"
          style="background:var(--red);color:#fff;border:none;border-radius:10px;
                 padding:12px 28px;font-family:var(--fh);font-size:.9rem;
                 letter-spacing:1px;cursor:pointer;width:100%">
          Got it — Close
        </button>
      </div>
    </div>`);
}


async function renderAdminRiders(){
  const [pendingData, approvedData, suspendedData] = await Promise.all([
    apiFetch('/api/admin/riders/pending'),
    apiFetch('/api/admin/riders/approved'),
    apiFetch('/api/admin/riders/suspended'),
  ]);
  const pending   = pendingData   || [];
  const approved  = approvedData  || [];
  const suspended = suspendedData || [];

  const getImgUrl = async (path) => {
    if(!path) return null;
    const { data } = await supa.storage.from('rider-docs').createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  // Pending — full doc review cards
  const pendingCards = await Promise.all(pending.map(async r => {
    const idUrl      = await getImgUrl(r.id_photo_url);
    const licUrl     = await getImgUrl(r.license_photo_url);
    const selfieUrl  = await getImgUrl(r.selfie_url);
    return `
      <div class="rider-rev" id="rr-${r.phone}">
        <div class="rr-top">
          <div class="rr-av">👤</div>
          <div>
            <div class="rr-name">${r.name||'Unknown'}</div>
            <div class="rr-phone">${F.phone(r.phone)} · Applied ${F.date(r.created_at)}</div>
          </div>
        </div>
        <div class="doc-row">
          ${r.id_photo_url ? `<div class="dc"><img src="${idUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">National ID</div></div>` : '<div class="dc"><span class="dc-e">🪪</span>No ID uploaded</div>'}
          ${r.license_photo_url ? `<div class="dc"><img src="${licUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">License</div></div>` : '<div class="dc"><span class="dc-e">🚗</span>No License uploaded</div>'}
          ${r.selfie_url ? `<div class="dc"><img src="${selfieUrl}" style="width:100%;border-radius:8px;cursor:pointer" onclick="window.open(this.src)"/><div style="font-size:.7rem;color:var(--muted);margin-top:4px">Selfie</div></div>` : '<div class="dc"><span class="dc-e">🤳</span>No Selfie uploaded</div>'}
        </div>
        <div class="rr-btns">
          <button class="btn btn-green btn-full btn-sm" onclick="approveRider('${r.phone}')">✅ Approve Rider</button>
          <button class="btn btn-danger btn-sm" onclick="rejectRider('${r.phone}')">Reject</button>
        </div>
      </div>`;
  }));

  // Approved — compact rows with suspend button
  const approvedRows = approved.map(r => `
    <div class="o-row" id="rr-${r.phone}">
      <div class="or-l">
        <div class="or-num">🏍️ ${r.name||'Unknown'}</div>
        <div class="or-m">${F.phone(r.phone)} · ⭐ ${r.rating||'New'} · ${r.total_deliveries||0} deliveries · ${r.is_available?'<span style="color:var(--green)">🟢 Online</span>':'⚪ Offline'}</div>
      </div>
      <div class="or-r">
        <button class="btn btn-ghost btn-sm" style="color:var(--orange);font-size:.73rem;border:1px solid var(--orange)"
          onclick="suspendActiveRider('${r.phone}','${r.name||'this rider'}')">🚫 Suspend</button>
      </div>
    </div>`).join('');

  // Suspended — compact rows with reinstate button
  const suspendedRows = suspended.map(r => `
    <div class="o-row" id="rr-${r.phone}" style="border-left:3px solid var(--red)">
      <div class="or-l">
        <div class="or-num" style="color:var(--red)">🚫 ${r.name||'Unknown'}</div>
        <div class="or-m">${F.phone(r.phone)} · Suspended</div>
      </div>
      <div class="or-r">
        <button class="btn btn-green btn-sm" onclick="unsuspendRider('${r.phone}','${r.name||'this rider'}')">✅ Reinstate</button>
      </div>
    </div>`).join('');

  document.getElementById('a-riders').innerHTML = `
    <div class="a-sec-t">PENDING APPROVAL (${pending.length})</div>
    ${pending.length
      ? pendingCards.join('')
      : '<div class="empty" style="padding:16px"><div class="ei" style="font-size:1.8rem">✅</div><p style="font-size:.82rem">No pending applications</p></div>'}

    <div class="a-sec-t" style="margin-top:20px">ACTIVE RIDERS (${approved.length})</div>
    ${approved.length
      ? `<div style="background:var(--dark2);border-radius:var(--r);overflow:hidden">${approvedRows}</div>`
      : '<div style="color:var(--muted);font-size:.82rem;padding:12px 4px">No approved riders yet</div>'}

    ${suspended.length ? `
    <div class="a-sec-t" style="margin-top:20px">SUSPENDED RIDERS (${suspended.length})</div>
    <div style="background:var(--dark2);border-radius:var(--r);overflow:hidden">${suspendedRows}</div>` : ''}
  `;
}

async function approveRider(phone) {
  await apiFetch('/api/admin/riders/approve',{method:'POST',body:{phone}});
  const el=document.getElementById(`rr-${phone}`);
  if(el){ el.style.opacity='0'; el.style.transform='scale(.95)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }
  toast('✅ Rider approved and notified!','ok');
}

async function rejectRider(phone) {
  if(!confirm('Reject this rider application?')) return;
  await apiFetch('/api/admin/riders/suspend',{method:'POST',body:{phone}});
  const el=document.getElementById(`rr-${phone}`);
  if(el) { el.style.opacity='0'; setTimeout(()=>el.remove(),300); }
  toast('Rider rejected','warn');
}

// Suspend an already-approved rider
async function suspendActiveRider(phone, name) {
  if(!confirm(`Suspend ${name}?\nThey will be logged out and cannot accept orders until reinstated.`)) return;
  const res = await apiFetch('/api/admin/riders/suspend',{method:'POST',body:{phone}});
  if(res?.success || res !== null){
    toast(`🚫 ${name} suspended`,'warn');
    renderAdminRiders();
  } else {
    toast('Could not suspend rider — try again','err');
  }
}

// Lift a suspension — rider goes back to approved
async function unsuspendRider(phone, name) {
  if(!confirm(`Reinstate ${name}?\nThey will be able to log in and accept orders again.`)) return;
  const res = await apiFetch('/api/admin/riders/unsuspend',{method:'POST',body:{phone}});
  if(res?.success){
    toast(`✅ ${name} reinstated — SMS sent`,'ok');
    renderAdminRiders();
  } else {
    toast(res?.error || 'Could not reinstate rider','err');
  }
}


async function renderAdminMenu() {
  const el = document.getElementById('a-menu');
  if (!el) return;

  // ── Loading state ──────────────────────────────────────────────────────
  el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
    <div class="spin" style="margin:0 auto 12px"></div>
    Loading menu...
  </div>`;

  const data = await apiFetch('/api/menu?all=true'); // FIX: fetch all items with categories in one go, instead of multiple calls per category

  // ── Normalize items ────────────────────────────────────────────────────
  // API returns { "Category Name": [items] }
  const items = data
    ? Object.entries(data).flatMap(([cat, catItems]) =>       // ✅ 'cat' matches usage below
        (catItems || []).map(i => ({ ...i, category: i.category || cat }))
      )
    : Object.entries(MENU).flatMap(([cat, catItems]) =>       // ✅ 'catItems' matches usage below
        catItems.map(i => ({ ...i, category: cat, available: true }))
      );

  // ── Debug: log what we got ────────────────────────────────────────────
  console.log('Menu data from API:', data);
  console.log('Normalized items:', items);

  if (!items || items.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">
      No menu items found. Add your first item below.
    </div>`;
    return;
  }

  // ── Group by category ──────────────────────────────────────────────────
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });

  console.log('Grouped by category:', Object.keys(byCategory));

  // ── Render ─────────────────────────────────────────────────────────────
  el.innerHTML =

    // ADD NEW ITEM FORM
    `<div class="card" style="margin-bottom:20px">
      <div class="card-t">ADD NEW ITEM</div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Name</label>
        <input class="inp" id="new-item-name" placeholder="e.g. Spicy Twister"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Category</label>
        <select class="inp" id="new-item-cat">
          ${['Brand New', ...Object.keys(MENU).filter(c => c !== 'Brand New')]
            .map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Price (KES)</label>
        <input class="inp" id="new-item-price" type="number" placeholder="e.g. 650"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Description</label>
        <input class="inp" id="new-item-desc"
          placeholder="e.g. Crispy chicken in tortilla wrap"/>
      </div>

      <div class="field" style="margin-bottom:8px">
        <label class="field-lbl">Image URL (optional)</label>
        <input class="inp" id="new-item-img" placeholder="https://..."/>
      </div>

      <div class="field" style="margin-bottom:14px">
        <label class="field-lbl">Position in Category</label>
        <input class="inp" id="new-item-order" type="number" min="1"
          placeholder="e.g. 3 — leave blank to add at end"/>
        <div style="font-size:.74rem;color:var(--muted);margin-top:4px">
          Lower number = appears higher in the list
        </div>
      </div>

      <button class="btn btn-primary btn-full" onclick="addMenuItem()">
        + Add to Menu
      </button>
    </div>`

    // ITEMS GROUPED BY CATEGORY
    + Object.entries(byCategory).map(([cat, catItems]) => `

      <div style="margin-bottom:22px">

        <!-- Category header -->
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:8px;
          font-family:var(--fh);
          font-size:.72rem;
          letter-spacing:1.5px;
          color:var(--muted);
          border-radius:8px;
          padding:7px 12px;
          background:var(--dark3)">
          <span>${cat.toUpperCase()}</span>
          <span style="color:var(--orange)">
            ${catItems.length} item${catItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <!-- Items -->
        ${catItems.map(item => `
          <div class="menu-toggle-item" id="mti-${item.id}">

            <div class="mt-info">
              <div class="mt-name">${item.name}</div>
              <div class="mt-cat"
                style="font-size:.72rem;color:var(--muted);margin-top:2px">
                ${item.description || ''}
              </div>
            </div>

            <div class="mt-price">${F.money(item.price)}</div>

            <div class="toggle-sm${item.available ? ' on' : ''}"
              id="mt-${item.id}"
              onclick="toggleMenuItem(${item.id}, this)"
              title="${item.available
                ? 'Available — click to hide'
                : 'Hidden — click to show'}">
            </div>

            <button
              onclick="deleteMenuItem(${item.id},
                '${item.name.replace(/'/g, "\\'")}', this)"
              style="background:none;border:none;cursor:pointer;
                     font-size:1.1rem;padding:4px 6px;
                     opacity:.6;line-height:1;flex-shrink:0"
              title="Delete ${item.name}">
              🗑️
            </button>

          </div>
        `).join('')}

      </div>
    `).join('');
}
// ── ADMIN REVENUE HISTORY ─────────────────────────────────────────────────────
// Separate tab — does not touch or replace today's metrics on Overview.
// Shows a day-by-day breakdown for the past N days with totals.

async function renderAdminRevenue() {
  const el = document.getElementById('a-revenue');
  if (!el) return;
  el.innerHTML = `<div style="text-align:center;padding:30px"><span class="spin"></span></div>`;

  const days = parseInt(document.getElementById('rev-days-sel')?.value || '30');
  const data = await apiFetch(`/api/admin/revenue/history?days=${days}`);

  if (!data) {
    el.innerHTML = `<div class="empty">
      <div class="ei">📊</div>
      <h3>COULD NOT LOAD REVENUE</h3>
      <p>Check your connection and try again</p>
    </div>`;
    return;
  }

  // ── Apply frontend clear filter ────────────────────────────────────────
  const clearedAt = localStorage.getItem(REVENUE_CLEAR_KEY); // e.g. "2025-05-12"
  
  let { history = [], grand_total = 0 } = data;

  if (clearedAt) {
    // Hide all days on or before the cleared date
    history = history.filter(d => d.date > clearedAt);
    // Recalculate grand total for visible entries only
    grand_total = history.reduce((s, d) => s + (d.total || 0), 0);
  }

  const fmtDate = dateStr => {
    const today = new Date().toISOString().slice(0, 10);
    const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Today';
    if (dateStr === yest)  return 'Yesterday';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' });
  };

  const maxTotal = history.length ? Math.max(...history.map(d => d.total), 1) : 1;

  const rows = history.length
    ? history.map(d => {
        const barPct = Math.round((d.total / maxTotal) * 100);
        return `
          <div style="background:var(--dark3);border-radius:10px;
               padding:14px 16px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;
                 align-items:center;margin-bottom:6px">
              <span style="font-weight:700;font-size:.9rem">${fmtDate(d.date)}</span>
              <span style="font-family:var(--fh);color:var(--green);
                   font-size:1.05rem;letter-spacing:1px">
                KES ${d.total.toLocaleString()}
              </span>
            </div>
            <div style="height:4px;background:var(--line);border-radius:2px;
                 margin-bottom:8px;overflow:hidden">
              <div style="height:100%;width:${barPct}%;background:var(--green);
                   border-radius:2px;transition:width .4s"></div>
            </div>
            <div style="display:flex;gap:16px;font-size:.75rem;color:var(--muted)">
              <span>📦 ${d.orders} order${d.orders !== 1 ? 's' : ''}</span>
              <span>🍗 Food: KES ${d.food_revenue.toLocaleString()}</span>
              <span>🏍️ Delivery: KES ${d.delivery_revenue.toLocaleString()}</span>
            </div>
          </div>`;
      }).join('')
    : `<div class="empty" style="padding:30px">
        <div class="ei">📊</div>
        <p style="font-size:.82rem;margin-bottom:14px">
          No revenue to display for this period
        </p>
        ${clearedAt ? `
          <button class="btn btn-ghost btn-sm" onclick="resetRevenueHistory()">
            ↩ Restore Hidden History
          </button>` : ''}
      </div>`;

  el.innerHTML = `

    <!-- Header row -->
    <div style="display:flex;justify-content:space-between;align-items:center;
         margin-bottom:14px;flex-wrap:wrap;gap:10px">

      <div class="a-sec-t" style="margin:0">REVENUE HISTORY</div>

      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">

        <!-- Period selector -->
        <select id="rev-days-sel" class="inp"
          style="width:auto;padding:8px 12px;font-size:.82rem"
          onchange="renderAdminRevenue()">
          <option value="7"   ${days === 7   ? 'selected' : ''}>Last 7 days</option>
          <option value="30"  ${days === 30  ? 'selected' : ''}>Last 30 days</option>
          <option value="90"  ${days === 90  ? 'selected' : ''}>Last 90 days</option>
          <option value="365" ${days === 365 ? 'selected' : ''}>Last year</option>
        </select>

        <!-- Clear button -->
        <button onclick="clearRevenueHistory()"
          style="background:var(--dark3);border:1px solid var(--line);
                 color:var(--muted);padding:8px 14px;border-radius:8px;
                 font-size:.78rem;cursor:pointer;white-space:nowrap">
          🗑 Clear View
        </button>

        <!-- Restore button — only shown when history is cleared -->
        ${clearedAt ? `
          <button onclick="resetRevenueHistory()"
            style="background:none;border:1px solid var(--green);
                   color:var(--green);padding:8px 14px;border-radius:8px;
                   font-size:.78rem;cursor:pointer;white-space:nowrap">
            ↩ Restore
          </button>` : ''}

      </div>
    </div>

    <!-- Cleared notice -->
    ${clearedAt ? `
      <div style="background:rgba(255,165,0,.08);border:1px solid var(--orange);
           border-radius:8px;padding:10px 14px;margin-bottom:14px;
           font-size:.78rem;color:var(--orange);display:flex;
           justify-content:space-between;align-items:center">
        <span>📅 Showing history after ${clearedAt} only</span>
        <button onclick="resetRevenueHistory()"
          style="background:none;border:none;color:var(--orange);
                 font-size:.78rem;cursor:pointer;text-decoration:underline">
          Show all
        </button>
      </div>` : ''}

    <!-- Grand total card -->
    <div style="background:var(--dark2);border:1px solid var(--line2);
         border-radius:var(--r);padding:18px 20px;margin-bottom:16px;
         display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:.75rem;color:var(--muted);
             letter-spacing:1px;margin-bottom:4px">
          TOTAL REVENUE · ${days} DAYS
        </div>
        <div style="font-family:var(--fh);font-size:2rem;
             color:var(--green);letter-spacing:2px">
          KES ${grand_total.toLocaleString()}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px">
          DAYS WITH ORDERS
        </div>
        <div style="font-family:var(--fh);font-size:1.6rem">
          ${history.length}
        </div>
      </div>
    </div>

    <!-- Daily rows -->
    ${rows}
  `;
}

// Frontend "clear history" — does not delete data, just hides it from view until the next reload

const REVENUE_CLEAR_KEY = 'mb_revenue_cleared_at';
function clearRevenueHistory() {
  if (!confirm('Clear revenue history from view? This does not delete any data, but hides all days on or before today to help you focus on recent performance. You can restore the full history at any time.')) return;

  localStorage.setItem(REVENUE_CLEAR_KEY, new Date().toISOString().slice(0, 10)); // e.g. "2025-05-12"  
  toast('Revenue history cleared from view. Showing only entries after today.', 'ok', 4000);
  renderAdminRevenue();
}

// Remove the "clear" filter and show all history again
function resetRevenueHistory() {
  localStorage.removeItem(REVENUE_CLEAR_KEY);
  toast('Full revenue history restored.', 'ok', 3000);
  renderAdminRevenue();
}

async function addMenuItem() {
    const name        = document.getElementById('new-item-name')?.value.trim();
    const category    = document.getElementById('new-item-cat')?.value;
    const price       = document.getElementById('new-item-price')?.value.trim();
    const img         = document.getElementById('new-item-img')?.value.trim();
    const description = document.getElementById('new-item-desc')?.value.trim();
    const sortOrder   = document.getElementById('new-item-order')?.value.trim();

    if(!name || !price){ toast('Name and price are required','err'); return; }
    const result = await apiFetch('/api/menu', {
      method: 'POST',
      body: {
        name, category, price, description, img,
        sort_order: sortOrder ? parseInt(sortOrder) : 999
      }
    });

    if(result?.success) {
      toast(`✅ ${name} added to menu!`, 'ok');
        document.getElementById('new-item-name').value  = '';
        document.getElementById('new-item-price').value = '';
        document.getElementById('new-item-desc').value  = '';
        document.getElementById('new-item-img').value   = '';
        document.getElementById('new-item-order').value = '';
        renderAdminMenu();
    } else {
      toast('Could not add item','err');
    }
}


async function toggleMenuItem(id,el) {
  el.classList.toggle('on');
  const on=el.classList.contains('on');
  await apiFetch(`/api/menu/${id}`,{method:'PATCH',body:{available:on}});
  toast(on?'Item enabled':'Item hidden');
}

async function deleteMenuItem(id, name, btn){
  if(!confirm(`Permanently delete "${name}" from the menu?\n\nThis cannot be undone.`)) return;
  btn.innerHTML = '⏳'; btn.disabled = true;
  const res = await apiFetch(`/api/menu/${id}`, {method:'DELETE'});
  if(res?.success || res !== null){
    const row = document.getElementById(`mti-${id}`);
    if(row){
      row.style.transition = 'opacity .2s, transform .2s, max-height .3s';
      row.style.opacity = '0';
      row.style.transform = 'scaleY(0)';
      row.style.maxHeight = '0';
      row.style.overflow = 'hidden';
      setTimeout(()=>row.remove(), 320);
    }
    toast(`"${name}" deleted from menu`, 'ok');
  } else {
    btn.innerHTML = '🗑️'; btn.disabled = false;
    toast('Could not delete item — try again', 'err');
  }
}

// RESTORE SESSION
document.addEventListener('DOMContentLoaded', async () => {

  // Register Service Worker for background notifications (Android Chrome requires this)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
    // When user taps a background notification, the SW sends NOTIF_CLICK
    // and we invoke whatever callback was stored at the time the notif was sent
    navigator.serviceWorker.addEventListener('message', e => {
      if(e.data?.type === 'NOTIF_CLICK' && window._notifClickCb){
        window._notifClickCb();
        window._notifClickCb = null;
      }
    });
  }

    // ── Notification intent recovery (survives page reload) ───────────────────
  // Android Chrome reloads the tab when a notification is tapped.
  // window._notifClickCb is lost on reload, but we wrote the intent to
  // localStorage before firing — read it back and act on it after session restore.
  try {
    const intentRaw = localStorage.getItem('mb_notif_intent');
    if(intentRaw){
      const intent = JSON.parse(intentRaw);
      const age = Date.now() - (intent.ts || 0);
      localStorage.removeItem('mb_notif_intent'); // consume once — never replay
      if(age < 30000) window._pendingNotifIntent = intent; // hand off to launchRider/launchCustomer
    }
  } catch(e) {}
  const saved = localStorage.getItem('mb_user');
  if(saved){ try{ user=JSON.parse(saved); }catch{} }

  // If a ?role= param is present, ALWAYS go to that role's login —
  // never auto-restore a previous session. Lets staff open kitchen/rider/admin
  // in a new tab without being hijacked by a saved customer (or other) session.
  const urlRole = new URLSearchParams(window.location.search).get('role');
  if(urlRole === 'kitchen') { selectRole('kitchen');    return; }
  if(urlRole === 'admin')   { screen('s-admin-login');  return; }
  if(urlRole === 'rider')   { selectRole('rider');      return; }
  if(urlRole === 'customer'){ selectRole('customer');   return; }

  // No ?role= in URL — restore previous session as normal
  if(localStorage.getItem('mb_kitchen')){
    role = 'kitchen'; launchKitchen(); return;
  }

  if(user.name && user.phone){
    role = 'customer'; launchCustomer(); return;
  }

  const savedRider = localStorage.getItem('mb_rider');
  if(savedRider){
    try{
      const rd = JSON.parse(savedRider);
      if(!rd.phone) throw new Error('no phone in saved rider');
      user.phone = rd.phone;

            // Restore from localStorage immediately — don't wait for network.
      // The rider's name may be cached in mb_rider from a previous session.
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
        launchRider();
        if(riderState.activeOrder?.id) startRiderChatListener(riderState.activeOrder.id);
        // Background-verify with server — update if different, but NEVER log out on failure.


       // If Render is sleeping, apiFetch returns null — we keep the local session intact.
        apiFetch('/api/rider/login', {method:'POST', body:{phone:rd.phone}})
          .then(data => {
            if(!data) return; // network error / backend sleeping — keep local session
            if(data.exists === false){
              // Server says this phone has no rider account — clear the session
              localStorage.removeItem('mb_rider');
              role = null; screen('s-landing');
              return;
            }
            if(data.status === 'suspended'){
              localStorage.removeItem('mb_rider');
              role = null; screen('s-landing');
              toast('Your rider account has been suspended. Contact MotoBite support.','err',8000);
              return;
            }  if(data.name && data.status === 'approved'){
              // Silently update riderState with fresh server data
              riderState = {...riderState, ...data, phone:rd.phone};
              if(rd.online) riderState.online = true;
              // Persist updated data back to localStorage
              const updated = {...rd, name:data.name, rating:data.rating,
                deliveries:data.total_deliveries, status:data.status};
              localStorage.setItem('mb_rider', JSON.stringify(updated));
            }
          });
        return;
  }

  // No name cached — must hit the network (first restore after registration)
      const data = await apiFetch('/api/rider/login',{method:'POST',body:{phone:rd.phone}});

      if(!data){
        // Network failure — restore anyway from what we have stored
        // Better to show the rider their dashboard than log them out on a slow connection
        riderState = {...riderState, phone:rd.phone, online: rd.online||false};
        role = 'rider'; launchRider(); return;
      }
      if(data.name && data.status === 'approved'){
        riderState = {...riderState, ...data, phone:rd.phone};
        if(rd.online) riderState.online = true;
        // Cache name + key fields so next restore can skip the network call
        const toStore = {...rd, name:data.name, rating:data.rating,
          deliveries:data.total_deliveries, status:data.status};
        localStorage.setItem('mb_rider', JSON.stringify(toStore));
        role = 'rider'; launchRider();
        if(riderState.activeOrder?.id) startRiderChatListener(riderState.activeOrder.id);
        return;
      }
      // Server says not approved / not found — clear session
      localStorage.removeItem('mb_rider');

    }catch(e){
      console.warn('Rider session restore error:', e.message);
      // Do NOT delete mb_rider on unexpected errors — keep session and try next time
    }
  }
  const { data: { session }} = await supa.auth.getSession();
  if(session){
    role = 'admin'; launchAdmin(); return;
  }

}); // ← closes DOMContentLoaded
// onAuthStateChange — ONLY affects admin sessions.
// Riders and customers are NOT Supabase auth users. Firing screen('s-landing')
// on every SIGNED_OUT event would log out riders/customers whenever the anon
// token drifts or Supabase does a silent refresh in the background.
supa.auth.onAuthStateChange((event, session) => {
  const urlRole = new URLSearchParams(window.location.search).get('role');
  if(urlRole) return;

  if(event === 'SIGNED_IN' && role !== 'admin'){
    // Only take action if no other role is active — avoids hijacking rider/customer
    if(!role){ role = 'admin'; launchAdmin(); }
  }

  if(event === 'SIGNED_OUT' && role === 'admin'){
    // Only log out if we were actually in admin mode
    role = null;
    screen('s-landing');
  }
  // SIGNED_OUT for any other role = ignore completely.
  // Rider/customer sessions are managed by mb_rider/mb_user localStorage keys,
  // not by Supabase auth. We never call supa.auth.signOut() for them.
}); // ← closes onAuthStateChange




// Admin Supabase Login
async function adminLogin() {
    const btn = document.getElementById('adm-login-btn');
    const err = document.getElementById('adm-err');
    const email = document.getElementById('adm-email')?.value.trim();
     const pass = document.getElementById('adm-pass')?.value.trim();

     err.style.display ='none'
     if(!email || !pass){ err.textContent='Enter email and password.'; err.style.display='block'; return; }

     btn.innerHTML = '<span class="spin"></span>'; btn.disabled = true;
     const { data, error} = await supa.auth.signInWithPassword({ email, password: pass});
     btn.innerHTML='Sign In →'; btn.disabled=false;

     if(error){
      err.textContent = error.message ==='Invalid login credentials'
        ? 'Wrong email or password.' : error.message;
        err.style.display ='block';
        return;
     }

     role ='admin';
     launchAdmin();
}

// Admin sign out
async function adminSignOut() {
    await supa.auth.signOut();
    if(window._adminInterval) clearInterval(window._adminInterval);
    role = null;
    toast('signed out');

    const urlRole = new URLSearchParams(window.location.search).get('role');
    if(urlRole === 'admin'){ screen('s-admin-login'); return; }

  screen('s-landing');
}

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