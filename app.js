
// CONFIG
const API = window.location.hostname === 'localhost'
? 'http://localhost:3000'
: 'https://kfc-narok-backend-production.up.railway.app'; // updated

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
let foodR = 0, riderR = 0;
let riderState = {name:'', phone:'', rating:0, deliveries:0, online:false, regStep:0, regData:{}, activeOrder:null, collected:false, todayTrips:0, todayEarnings:0};
let pinBuf ='';
let oTimer = null;
let kOrders = [];
let kDone = 0;

// DEMO DATA for admin and history fallback
const DEMO_ORDERS_A = [];
const DEMO_RIDERS = [];

// DEMO DATA
const MENU = {

    Promos:[
        {id:1001, name:'Streetwise 9 Butter Chicken', price:1990, desc:'9 pcs Butter Chicken + chips', img:'https://glovo.dhmedia.io/image/menus-glovo/products/8114f8df70a749a6b666bce4d1e146e1a6f45e0026a3eb17a1c97b608fe768cd?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1002, name:'Mega Wing Box Chicken', price:790, desc:'Wings + Butter Chicken combo box',    img:'https://glovo.dhmedia.io/image/menus-glovo/products/e1f6b814dd2d1ee2c1397d014fd32aa3bccd0c030a8cb4159cefe776bd015577?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1003, name:'Dipping Box',      price:1990, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 3 dipping sauces',  img:'https://glovo.dhmedia.io/image/menus-glovo/products/41940fa143d81d7ae2daef32e43b7395dc289902db6458edc5fbf3ad9c2c3fcf?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:1004, name:'Dipping Box With 1,25l Soda', price:2200, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 1.25L soda + 3 dipping sauces', img:'https://glovo.dhmedia.io/image/menus-glovo/products/e63722651372325e893d134dfdebb451a2808b70a83110fa138f6a27b1599576?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
    ],

    Streetwise:[
        {id:1, name:'Streetwise 1',           price:390,   desc:'1pc OR / SPICY + Reg chips',                            img:'https://glovo.dhmedia.io/image/menus-glovo/products/635c67095267875bcc69f291c4f6260a710263bf6e12462212b1b9916605534a?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:2,  name:'Streetwise 1 with Rice',price:390,   desc:'1 pc Original Recipe + Colonel rice',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/a9e87805-6236-e07a-6121-ed1485c09cf1.jpeg?a=52c9137d-05ab-0ded-0fff-21c34132e4cb'},
        {id:3, name:'Streetwise 2',           price:490,   desc:'2pcs OR / SPICY + Colonel Rice or Reg. fries',          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/37fd6de8-12ad-4016-ab2e-ef3e491f4ee8.jpeg?a=2f70c603-e474-d115-c163-cf23286fc21b'},                
        {id:4, name:'Streetwise 2 Large',     price:590,   desc:'2pcs OR / SPICY + Lrg. fries',                          img:'https://glovo.dhmedia.io/image/menus-glovo/products/1c9a697f669535c798bfcba2881dad5f959894d03502d3badc389a98223537a1?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:5, name:'Streetwise 2 Crunch',    price:450,   desc:'2pcs OR / SPICY + Tortilla chips',                      img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9f60ca25-162c-5872-e514-93615c9430a8.jpeg?a=2875a9d0-f24e-9f95-0c02-05772acc77ff'},
        {id:6, name:'Streetwise 3',           price:690,   desc:'3pcs OR / SPICY + Reg. fries',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/1185e73b-10f6-f5d6-a3ad-564ce2dc0c09.jpeg?a=a55ab509-2f77-bffb-5bc1-69e8381b26ea'},
        {id:7, name:'Streetwise 3 with Rice', price:690,   desc:'3pcs OR / SPICY + Colonel Rice',                        img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9ba70c82-600c-68f5-96bd-5ad7f6a784d2.jpeg?a=8cbc68dc-2d6e-8089-0b7a-ecbfd636dd97'},
        {id:8, name:'Streetwise 3 Crunch',    price:650,   desc:'3 pcs Original Recipe + Tortilla chips',                img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/3acb77db-7590-9f73-63cd-5474b569c4d2.jpeg?a=0f0aab3c-3ce6-63cb-3b88-24f51b1b6b84'},
        {id:9, name:'Streetwise 5',           price:1200,  desc:'5pcs OR / SPICY + Lrg. fries',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/d332379d-7387-21b8-75e0-e69787140f20.jpeg?a=1f96a8ba-ee8e-3a9a-7734-f217b5e2b673'},
       {id:10, name:'Streetwise 5 Crunch', price:1150, desc:'5pcs OR / SPICY + Tortilla chips',                          img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/9f60ca25-162c-5872-e514-93615c9430a8.jpeg?a=2875a9d0-f24e-9f95-0c02-05772acc77ff'},
        {id:11, name:'Streetwise 7',          price:1790,  desc:'7pc OR / SPICY + Family fries + 1.25l soda',            img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f7479255-3aab-2264-0729-71591251283d.jpeg?a=6d2ac5f0-7591-fb3e-413f-30e36455129f'}, 
    ],

    Burgers:[
        {id:14, name:'Zinger Burger',           price:650,  desc:'Spicy criscpy chicken burger',  img:'https://glovo.dhmedia.io/image/menus-glovo/products/224fecf2b8bd2cdcab6c80396562b2555e861344b526e3253b211f81a28228fa?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:15, name:'Zinger Burger Meal',      price:850,  desc:'Zinger Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/626d220b-717d-2ae1-ad61-952bf4ab693a.jpeg?a=0792b96a-c2b0-8bde-3490-714534582c64'},
        {id:16, name:'Crunch Burger',           price:470,   desc:'OR / Spicy Crunch chicken burger', img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/626d220b-717d-2ae1-ad61-952bf4ab693a.jpeg?a=0792b96a-c2b0-8bde-3490-714534582c64'},
        {id:17, name:'Crunch Burger Meal',      price:650,    desc:'Crunch Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0226c397-2a2a-2348-bdc6-9f8c6ad1bfd8.jpeg?a=9511d03b-b6f7-ea96-624b-dbaf285b601f'},
        {id:18, name:'Colonel Burger',          price:650,    desc:'Classic Colonel chicken burger',    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/e9d5c40f-2fb2-f327-a6fc-f599576167fb.jpeg?a=df731449-20fc-230e-9524-61c570acea1d'},
        {id:19, name:'Colonel Burger Meal',     price:850,    desc:'Colonel Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/542ce49a-9bfe-0bad-eb6e-4c141d98c397.jpeg?a=0efd49ab-e001-a8cf-94b1-f5b55b4686b0'},
        {id:20, name:'Double Crunch Burger',    price:690,     desc:'Double layer crunch chicken burger',   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/ca17b332-80a0-f415-9976-6d53be38b216.jpeg?a=50b79314-56ee-0bb4-9637-5a85ec63bb8c'},
        {id:21, name:'Double Crunch Burger Meal',   price: 890, desc:'Double Crunch Burger + Reg. chips + 500ml soda',  img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/f8c32194-96f3-49eb-437e-9d33377ee598.jpeg?a=cd6686fe-a21d-9350-64cd-1df38670a232'},
        {id:22, name:'Legend Burger',               price:690,  desc:'The legendary KFC burger',    img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/3b55a114-a25a-7a06-1b96-60d6002af506.jpeg?a=fdf9f88f-d102-f38a-d750-0e6bbf039073'},
        {id:23, name:'Legend Burger Meal',     price:890,     desc:'Legend Burger + Reg. chips + 500ml soda', img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/7fde61eb-f8c2-371e-ed06-faa9f0f0bf37.jpeg?a=ec46ad65-c649-c487-5cb2-1bf15e90415c'},
        {id:24, name:'Nyama Nyama Burger',     price:850,     desc:'Nyama Nyama Burger + Reg. chips + 500ml soda', img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/147575e3-fedf-1acd-cda9-b0ef8f608a78.jpeg?a=3d44471c-8e0c-6ca1-31fe-1918e2f1b623'},
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

    'Snacks & Sides':[
        {id:63, name:'3 Crispy Fillets',             price:490,  desc:'3 crispy chicken fillets + 1 dip',                   img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/0be83174-5ee6-7047-05f2-8d253e3a9b2b.jpeg?a=f0d9993f-f043-34a4-eb7f-ea2ab9f69d63'},
        {id:64, name:'6 Crispy Fillets',             price:890,  desc:'6 crispy chicken fillets',                           img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/2c198a58-d809-9673-cb4c-ecb01bbb2c6c.jpeg?a=cd8243fc-7de8-21f0-5f74-bf77f9c00783'},
        {id:65, name:'Crispy Strips Meal',           price:790,  desc:'3 Crispy Strips + Dip + Reg. chips + 500ml drink',  img:'https://cdn.tictuk.com/051a03c6-fbab-ee7d-18b0-a92132fba348/ad75c67d-1323-6d29-569f-d55a2c5f9dbb.jpeg?a=282ddf1d-443f-b864-de8f-f5e6a8c8ad04'},
        {id:66, name:'1 Piece Chicken',              price:290,  desc:'1 pc Original Recipe chicken',                       img:'https://cdn.tictuk.com/174eef87-5a5a-dc2e-edbf-611f0131dfe8/b39c8366-4b64-1efe-a197-3971fec1e7a0.jpeg?a=bc67e266-237e-54cc-4c95-f096e62121a7'},
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
  
  Kiddie:[
        {id:98,  name:'Kiddie Meal 1',  price:490,  desc:'6 Nuggets + Reg. chips + 350ml soda',      img:'https://glovo.dhmedia.io/image/menus-glovo/products/95395b9c31f3cf0e63a4a5cf5830eccc55fd46485612fb1aaf397636d815c7a1?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:99,  name:'Kiddie Meal 2',  price:450,  desc:'1 pc Chicken + Reg. chips + 350ml soda',   img:'https://glovo.dhmedia.io/image/menus-glovo/products/52d98da6cffc9931be62ca6551d8b7b4f727b39eeeda36ba0000e4d5c104a1c4?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:100, name:'Kiddie Meal 3',  price:550,  desc:'20 Pops + Reg. chips + 350ml soda',        img:'https://glovo.dhmedia.io/image/menus-glovo/products/73ff0591c9e74c1d6ff2e8f44ee9cd8fa70d9bcf7d4aa8136c224579f23e8a11?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
  ],

  Dipping:[
        {id:101, name:'Dipping Box',                 price:1990, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 3 dipping sauces',             img:'https://glovo.dhmedia.io/image/menus-glovo/products/41940fa143d81d7ae2daef32e43b7395dc289902db6458edc5fbf3ad9c2c3fcf?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
        {id:102, name:'Dipping Box With 1.25L Soda', price:2200, desc:'6 Wings + 6 Strips + 12 Nuggets + Lrg chips + 1.25L soda + 3 dipping sauces', img:'https://glovo.dhmedia.io/image/menus-glovo/products/e63722651372325e893d134dfdebb451a2808b70a83110fa138f6a27b1599576?t=W3sicmVzaXplIjp7Im1vZGUiOiJmaXQiLCJ3aWR0aCI6MzIwLCJoZWlnaHQiOjMyMH19XQ=='},
  ],

};

function ago(mins){ return new Date(Date.now()-mins*60000).toISOString();}

//API HELPER
async function apiFetch(path, opts={}) {
    try {
        const r = await fetch(API+path, {
            headers:{'Content-Type':'application/json','x-user-phone':user.phone,...(opts.headers||{})},
            ...opts, body:opts.body?JSON.stringify(opts.body):undefined
        });
        if(!r.ok) throw new Error(r.status);
        return r.json();
    } catch { return null;}
    
}

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

// FORMAT
const F = {
    money: a=>`KES ${Number(a).toLocaleString()}`,
    date: d=>new Date(d).toLocaleString('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}),
    phone: p=>{ const l=p.startsWith('254')?'0'+p.slice(3):p; return l.replace(/(\d{4})(\d{3})(\d{3})/,'$1 $2 $3'); },
    norm: p=>{ const d=p.replace(/\D/g,''); return d.startsWith('254')?d:d.startsWith('0')?'254'+d.slice(1):'254'+d; },
    age: d=>{ const m=Math.floor((Date.now()-new Date(d))/60000); return m<60?`${m}m`:`${Math.floor(m/60)}h`; },
    status: s=>({pending:'Awaiting payment',paid:'Payment confirmed',cooking:'Being prepared',ready:'Ready!',rider_assigned:'Rider on way', picked_up:'Out for delivery',delivered:'Delivered ✓',cancelled:'Cancelled'})[s]||s,
    badge: s=>({pending:'b-muted',paid:'b-blue',cooking:'b-orange',ready:'b-orange',rider_assigned:'b-blue',picked_up:'b-blue',delivered:'b-green',cancelled:'b-red'})[s]||'b-muted',
    emoji: c=>({Promos:'🔥',Streetwise:'🍗',Burgers:'🍔',Wraps:'🌯',Sharing:'🍗🍗',Wings:'🍖','Snacks & Sides':'🍟',Drinks:'🥤',Krushers:'🥤',Desserts:'🍦',Kiddie:'🧒',Dipping:'📦'})[c]||'🍽️'
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
    if(r=== 'admin'){role='admin'; screen('s-admin-login'); return;}
    document.getElementById('ai').textContent=cfg.icon;
    document.getElementById('at').textContent=cfg.title;
    document.getElementById('as').textContent=cfg.sub;
    document.getElementById('af').innerHTML=buildFields(cfg.fields);
    screen('s-auth');
    setTimeout(()=>document.querySelector('#af input')?.focus(),100);

    setTimeout(() => {
    const saved = localStorage.getItem('kfc_user');
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
                const savedRider = localStorage.getItem('kfc_rider');
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

async function authSubmit() {
    const btn=document.getElementById('auth-btn');
    btn.innerHTML='<span class="spin"></span>'; btn.disabled=true;
    const reset =()=>{ btn.innerHTML='Continue →'; btn.disabled=false; };

    if(role==='customer'){
        const name=document.getElementById('f-name')?.value.trim();
        const raw =document.getElementById('f-phone')?.value.trim();
        if(!name||name.length<2){ toast('Enter your full name','err'); return reset(); }
        if(!raw||raw.replace(/\D/g,'').length<9){ toast('Enter a valid phone number','err'); return reset(); }
        user={name, phone:F.norm(raw)};
        const isReturning=!!localStorage.getItem('kfc_user');
        localStorage.setItem('kfc_user',JSON.stringify(user));
        toast(isReturning?`Welcome back, ${name}! 👋`:`Welcome, ${name}! 🍗`,'ok');
        await apiFetch('/api/customer/login',{method:'POST',body:{phone:user.phone,name}});
        reset(); launchCustomer();
      }
     else if(role==='rider'){
 const raw=document.getElementById('f-phone')?.value.trim();
        if(!raw||raw.replace(/\D/g,'').length<9){ toast('Enter a valid phone number','err'); return reset(); }
        user.phone=F.norm(raw);
        const data=await apiFetch('/api/rider/login',{method:'POST',body:{phone:user.phone}});
        if(data){ riderState={...riderState,...data,phone:user.phone}; }
        else { riderState.phone=user.phone; }
        const isReturning=!!localStorage.getItem('kfc_rider');
        localStorage.setItem('kfc_rider',JSON.stringify({phone:user.phone}));
        toast(isReturning?`Welcome back! 🏍️`:`Welcome, Rider! 🏍️`,'ok');
        reset(); launchRider();

  } else if(role==='kitchen'){
    const code=document.getElementById('f-code')?.value.trim();
    if(!code){ toast('Enter the kitchen passcode','err'); return reset(); }
    const r=await apiFetch('/api/kitchen/verify',{method:'POST',body:{code}});
    if(!r?.ok){ toast('Wrong passcode — ask your manager','err'); return reset(); }
    reset(); launchKitchen();

  } else if(role==='admin'){
    const code=document.getElementById('f-code')?.value.trim();
    reset(); launchAdmin();
  } 
}




function goLanding(){
    screen('s-landing');
}
function exitRole(){
     role=null; cart=[]; screen('s-landing');
}

//CUSTOMER APP
let curCat='Promos'

async function launchCustomer(){
    screen('s-customer');
    const h=new Date().getHours();
    document.getElementById('c-greet').textContent=`${h<12?'Good morning':h<17?'Good afternoon':'Good evening'}, ${user.name}!`;
    // Fetch menu from backend, fall back to hardcoded MENU if offline
    const data = await apiFetch('/api/menu');
    if(data && Object.keys(data).length){
      Object.assign(MENU, data);
    }

    renderCats(); renderMenu('Promos'); updateCartUI();

    // Restore active order on login
      const savedOid = localStorage.getItem('kfc_active_order');
    if(savedOid){
        const order = await apiFetch(`/api/orders/${savedOid}`);
        if(order && !['delivered','cancelled'].includes(order.status)){
            showTracking(savedOid);
        } else { 
                   localStorage.removeItem('kfc_active_order');
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

function filterCat(cat){ curCat=cat; renderCats(); renderMenu(cat); }

function renderMenu(cat){
    const all=Object.entries(MENU).flatMap(([c,items])=>items.map(i=>({...i,category:c})));
    const filtered=all.filter(i=>i.category===cat);
    const grouped={};
    filtered.forEach(i=>{ if(!grouped[i.category])grouped[i.category]=[]; grouped[i.category].push(i); });
    document.getElementById('menu-list').innerHTML=Object.entries(grouped).map(([c,items],gi)=>`
    <div class="menu-sec-lbl">${c}</div>
    ${items.map((item,ii)=>`
        <div class="mi" style="animation-delay:${(gi*5+ii)*.045}s" onclick="addToCart(${item.id})">
        ${item.img
            ? `<div class="mi-img"><img src="${item.img}" alt="${item.name}" loading="lazy"/></div>`
            : `<div class="mi-emoji">${F.emoji(c)}</div>` }
         <div class="mi-info"><div class="mi-name">${item.name}</div><div class="mi-desc">${item.desc || item.description|| ''}</div></div>
          <div class="mi-r"><div class="mi-price">${F.money(item.price)}</div><div class="mi-add">+</div></div>
          </div>`).join('')}`).join('');
}



// Items that require a HC / OR chicken type choice before adding to cart
// These are items whose description says "OR / SPICY" — not wings, burgers, nuggets or
// items that already have a fixed type (Butter Chicken, Original Recipe only, Zinger etc.)
const CHICKEN_CHOICE_IDS = new Set([
  1, 3, 4, 5, 6, 7, 9, 10, 11,          // Streetwise items
  46, 47, 48, 49, 50, 51, 52,            // Sharing Buckets
  31,                                     // Chicken Lunchbox
  99                                      // Kiddie Meal 2
]);



function addToCart(id){
  const item=Object.values(MENU).flat().find(i=>i.id===id);
  if(!item) return;

   // Items with OR / SPICY choice — show picker before adding
   if(CHICKEN_CHOICE_IDS.has(id)){
    showChickenPicker(item);
    return;
  }
  // All other items — add straight to cart
  cart.push({...item, desc: item.desc || item.description || '',note:'', chickenType:null});
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
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">HC</div>
            <div style="font-size:.75rem;color:var(--muted);margin-top:4px">Hot &amp; Crispy</div>
          </button>

          <button class="chicken-opt" onclick="confirmChickenChoice('OR')">
            <div style="font-size:2rem;margin-bottom:6px">🍗</div>
            <div style="font-family:var(--fh);font-size:1rem;letter-spacing:1px">OR</div>
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


function updateCartUI(){
    const count=cart.length, total=cart.reduce((s,i)=>s+i.price,0);
    const fl=document.getElementById('cart-float');
    if(count>0){ // shows cart button if there's atleast 1 item
      fl.classList.remove('hidden'); //makes the cart btn visible
      document.getElementById('cf-cnt').textContent=count; //updates the red circle badge on the cart btn with the item count
      document.getElementById('cf-p').textContent=F.money(total); // updates the price shown on the cart btn, in KSH
    } else { fl.classList.add('hidden'); } //if cart is empty, hide the btn completely
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
  li.innerHTML=cart.map((item,i)=>`
    <div class="ci">
      <div class="ci-info">
        <div class="ci-name">${item.name}${item.chickenType?` <span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:.5px;vertical-align:middle">${item.chickenType}</span>`:''}</div>
        <input class="note-inp" placeholder="Special note (e.g. no onions)..." value="${item.note||''}" oninput="cart[${i}].note=this.value"/>
      </div>
      <div class="ci-r">
        <div class="ci-price">${F.money(item.price)}</div>
        <button class="ci-rm" onclick="removeCartItem(${i})">✕</button>
      </div>
    </div>`).join('');
  const total=cart.reduce((s,i)=>s+i.price,0);
  su.innerHTML=`<div class="cart-sum">
    <div class="srow"><span>Food subtotal</span><span>${F.money(total)}</span></div>
    <div class="srow">
  <span>Delivery fee</span>
  <span class="nt" style="color:var(--orange);font-size:.75rem">⏳ Agreed with rider on assignment</span>
</div>
    <div class="srow tot"><span>Pay to KFC Till</span><span>${F.money(total)}</span></div>
  </div>`;
  ac.innerHTML=`<button class="btn btn-primary btn-full btn-lg" onclick="closeCart();cPanel('location')">Confirm Order →</button>
  <button class="btn btn-ghost btn-full" style="margin-top:8px;color:var(--red);font-size:.82rem" onclick="cart=[];updateCartUI();closeCart()">🗑 Clear Cart</button>`;
}

function removeCartItem(i){
   cart.splice(i,1); // removes an item from the cart when x is clicked
   updateCartUI(); renderCartSheet();
   if(!cart.length)closeCart(); }


   async function getLocation() {
    const btn=document.getElementById('loc-btn');
    const err=document.getElementById('loc-err-box');
    const ok=document.getElementById('loc-ok-box');
    btn.innerHTML='<span class="spin"></span> Getting location...'; btn.disabled=true;  
    err.classList.add('hidden');
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude:lat,longitude:lng}=pos.coords;
      const dist=haversine(lat,lng,-1.0833,35.8667);
      if(dist>170){
          err.textContent=`❌ You're ${dist.toFixed(1)}km from KFC Narok. We only deliver within 170km.`;
          err.classList.remove('hidden'); btn.innerHTML='📍 Try Again'; btn.disabled=false; return;
      }

       // Reverse geocode — get human-readable area name from coordinates
      // Uses OpenStreetMap Nominatim ,no API key
       let areaName = 'Narok Town';
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const gd = await geo.json();
        const a = gd.address || {};
        // Build area string from most specific to least specific
        // e.g. "Narok Town", "Nakuru CBD", "Naivasha"
        areaName = a.suburb || a.village || a.town || a.city_district || a.city || a.county || 'Narok Town';
      } catch(e) {
        console.warn('Reverse geocode failed — using default area name');
      }

      userLoc={lat,lng};
      ok.innerHTML=`<div class="loc-ok"><div class="loc-ok-ico">✅</div><div><div class="loc-ok-t">Location confirmed!</div><div class="loc-ok-s">${dist.toFixed(1)}km from KFC Narok · ${lat.toFixed(4)}, ${lng.toFixed(4)}</div></div></div>`;
      ok.classList.remove('hidden');
      btn.textContent='✅ Continue to Payment';
      btn.onclick=goToPayment;
      btn.disabled=false;

    },()=>{ err.textContent='❌ GPS access denied. Enable location and try again.'; err.classList.remove('hidden'); btn.innerHTML='📍 Try Again'; btn.disabled=false; },{enableHighAccuracy:true,timeout:10000});
}

function goToPayment(){
  document.getElementById('pay-amt').textContent=F.money(cart.reduce((s,i)=>s+i.price,0));
  cPanel('payment');
}

async function initPay() {
  const btn=document.getElementById('pay-btn');
  btn.innerHTML='<span class="spin"></span> Placing order...'; btn.disabled=true;
  const total=cart.reduce((s,i)=>s+i.price,0);
  const notes=cart.filter(i=>i.note||i.chickenType).map(i=>`${i.name}${i.chickenType?' ['+i.chickenType+']':''}: ${i.note||''}`).join('; ');
  const order=await apiFetch('/api/orders',{method:'POST',body:{items:cart,notes,location:userLoc}});

  // If order creation failed — stop here, show error, let customer try again
  if(!order?.id){
    btn.innerHTML='✅ I Have Paid — Place Order'; btn.disabled=false;
    toast('Could not place order — check your connection and try again','err',5000);
    return;
  }

  const oid=order.id;
  active0Id=oid;
  localStorage.setItem('kfc_active_order',oid);
 
  // Show STK status box if the backend sent a push, otherwise keep manual instructions
    const stkBox=document.getElementById('stk-status');
  const manualPay=document.getElementById('manual-pay');
  if(order.stkSent){
    // STK push was sent — highlight the phone prompt
    if(stkBox)  stkBox.style.display='block';
    if(manualPay) manualPay.style.display='none';
    btn.innerHTML='📱 Waiting for M-Pesa payment...'; btn.disabled=true;
    toast('Check your phone — M-Pesa prompt sent! 📱','ok',6000);
  } else {
    // STK not yet live — manual payment flow
    btn.innerHTML='✅ I Have Paid — Place Order'; btn.disabled=false;
    toast('Order placed! Please complete M-Pesa payment 📱','ok',5000);
  }

 // go to tracking immediately, status updates when payment is done
 cart=[]; updateCartUI();
 showTracking(oid);

}

function showTracking(oid){
    cPanel('track');
    document.querySelectorAll('#s-customer .bnav-btn').forEach(b=>b.classList.toggle('on',b.dataset.s==='track'));
    renderTracking(oid);
    const iv=setInterval(()=>renderTracking(oid),12000);
    setTimeout(()=>clearInterval(iv),300000);
}

async function renderTracking(oid) {
    let o=await apiFetch(`/api/orders/${oid}`);
     if(!o){
      document.getElementById('track-body').innerHTML=`
        <div class="empty" style="padding-top:60px">
          <div class="ei">📦</div>
          <h3>ORDER NOT FOUND</h3>
          <p style="font-size:.83rem;color:var(--muted)">Could not load order #${oid}.<br>Check your connection or contact KFC Narok.</p>
          <button class="btn btn-ghost" style="margin-top:16px" onclick="cPanel('menu')">← Back to Menu</button>
        </div>`;
      return;
    }
    const steps=[
        {lbl:'Paid',     match:['paid','cooking','ready','rider_assigned','picked_up','delivered']},
        {lbl:'Cooking',  match:['cooking','ready','rider_assigned','picked_up','delivered']},
        {lbl:'On way',   match:['picked_up','delivered']},
        {lbl:'Done',     match:['delivered']},
    ];
    const ai=steps.findLastIndex(s=>s.match.includes(o.status)); // order status, render location, shared security code for the customer, ratings after delivery
    document.getElementById('track-body').innerHTML=`
    <div class="trk-hdr"><div class="trk-no">Order ${o.order_number}</div><div class="trk-st">${F.status(o.status)}</div><div class="trk-eta">${o.status==='delivered'?'Delivered successfully':'Est. 20-40 minutes'}</div></div>
    <div class="prog">
    ${steps.map((s,i)=>`
          <div class="ps ${i<ai?'done':''} ${i===ai?'act':''}">
           <div class="pd">${i<ai?'✓':s.lbl[0]}</div>
          <div class="pl">${s.lbl}</div>
        </div>
         ${i<steps.length-1?`<div style="flex:1;height:2px;background:${i<ai?'var(--green)':'var(--line2)'};margin-bottom:20px"></div>`:''}`).join('')}
    </div>
    <div style="padding:0 16px 16px;max-width:500px;margin:0 auto">
      ${o.rider_lat?`<div class="map-ph"><span style="position:relative;z-index:1;font-size:.85rem;color:var(--muted2)">Rider location</span><a class="map-link" href="https://maps.google.com/?q=${o.rider_lat},${o.rider_lng}" target="_blank">📍 Open Map</a></div>`:
      `<div class="map-ph"><span style="position:relative;z-index:1;font-size:.8rem;color:var(--muted)">Map updates when rider is assigned</span></div>`}
      <div class="card">
        <div class="card-t">ORDER SUMMARY</div>
         ${(o.items||[]).map(i=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:.87rem"><span>${i.name}${i.chickenType?` <span style="background:var(--red);color:#fff;font-size:.62rem;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:4px">${i.chickenType}</span>`:''}${i.note?` <span style="color:var(--orange);font-size:.73rem">(${i.note})</span>`:''}</span><span style="font-family:var(--fh);color:var(--red);letter-spacing:1px">${F.money(i.price)}</span></div>`).join('')}
      </div>
      </div>
      <div class="card" style="margin-top:11px;text-align:center;font-size:.81rem;color:var(--muted)">
        🔐 Your delivery PIN was sent by SMS<br>
        <span style="font-size:.73rem">Share it with your rider <strong style="color:var(--white)">only after</strong> receiving your food</span>
      </div>
      ${o.status==='delivered'?`
        <div class="card" style="margin-top:11px" id="rating-card">
          <div class="card-t">RATE YOUR ORDER</div>
          <p style="font-size:.8rem;color:var(--muted);margin-bottom:10px">Food quality:</p>
          <div class="stars" id="food-stars">${[1,2,3,4,5].map(n=>`<span class="star" onclick="setRating('food',${n})">⭐</span>`).join('')}</div>
          <p style="font-size:.8rem;color:var(--muted);margin:12px 0 8px">Rider service:</p>
          <div class="stars" id="rider-stars">${[1,2,3,4,5].map(n=>`<span class="star" onclick="setRating('rider',${n})">⭐</span>`).join('')}</div>
          <button class="btn btn-primary btn-full" style="margin-top:14px" onclick="submitRating()">Submit Rating</button>
        </div>`:''}
    </div>`;
    
}

function setRating(type,val){
    if(type==='food')foodR=val; else riderR=val;
    document.querySelectorAll(`#${type}-stars .star`).forEach((s,i)=>s.classList.toggle('lit',i<val)); // food and rider rating upto five stars
}
// async used to communicate with backed to await API-fetch
async function submitRating(){
    if(!foodR||!riderR){ toast('Please rate both food and rider','err'); return; } //checks that both ratings have been set. foodR & riderR starts with 0, !foodR-if foodR = 0,(not yet rated). if either missing show an error, "return" stops the function, nothing submitted until both rated. 
    await apiFetch(`/api/orders/${activeOId}/rate`,{method:'POST',body:{foodStars:foodR,riderStars:riderR}}); //sends both ratings to backend against the specific order ID. stored in supabase, foodR goes to restaurant, riderR goes to rider's profile. await means the function pause until backend responds before moving to next line.
    const rc=document.getElementById('rating-card');
    if(rc) rc.innerHTML='<div style="text-align:center;padding:14px"><div style="font-size:2rem">🙏</div><p style="font-family:var(--fh);letter-spacing:1px;margin-top:8px">THANK YOU!</p><p style="font-size:.82rem;color:var(--muted)">Your feedback helps us improve</p></div>';
  toast('Rating submitted! Thank you 🙏','ok');
}
// Customer Location vs KFC Narok Location, R = Earth's radius(in km), dL = difference in latitude (converted from degree to radians in Trigonometry), dG = longitude difference  //     
function haversine(a,b,c,d){ const R=6371,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
                                                                             // sine of half the latitude difference, squared. cosine of the first latitude(customer), cosine of second lattitude(KFC NAROK) sine of of half longitude difference squared. **2 = power of 2 
// Take two points on a sphere, figure out the angle between them accounting for Earth's curvature, then multiply by Earth's radius to get the real-world distance in kilometres.  




// RIDER APP

function launchRider(){
    screen('s-rider');
    // check if first time(no name) => Registration
    if(!riderState.name){
        riderState.regStep=0;
        renderRiderReg();
    } else {
        renderRiderHome();
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
        <div class="sm"><div class="sm-v" id="r-earn">KES ${riderState.todayTrips*100}</div><div class="sm-l">Today's Earnings</div></div>
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
    toast(riderState.online?'You are now ONLINE 🟢':'You are now offline');
    if(riderState.online) startLocTracking();
    // rider has toggled themselves online and does not currently have an active order. && = both must be true
}

function showRiderOrderAlert(o){
    const z=document.getElementById('r-alert-zone');
    if(!z) return;
    let t=180;
    z.innerHTML=`<div class="o-alert">
    <div class="oa-top"><div class="oa-title">🔔 NEW ORDER!</div><div class="oa-timer" id="ot">${fmtTime(t)}</div></div>
    <div class="oa-detail">📍 Collect: KFC Narok, Kenyatta Rd</div>
    <div class="oa-detail">📍 Deliver to: ${o.customer_area}</div>
    <div class="oa-detail">💰 Your fee: Agree with the customer</div>
    <div class="oa-items">${(o.items||[]).map(i=>`• ${i.name}${i.note?` (${i.note})`:''}`).join('<br>')}</div>
    <div class="oa-btns"><button class="btn-accept" onclick="acceptOrder()">✅ ACCEPT</button><button class="btn-decline" onclick="declineOrder()">Pass</button></div>
     </div>`;
    if(oTimer) clearInterval(oTimer);
    oTimer=setInterval(()=>{ t--; const el=document.getElementById('ot'); if(el)el.textContent=fmtTime(t); if(t<=0){clearInterval(oTimer);z.innerHTML='';riderState.activeOrder=null;toast('0rder expired - no response in time','warn');} },1000);
}

function fmtTime(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

function acceptOrder(){
    if(oTimer) clearInterval(oTimer);
    toast('Order accepted! Head to KFC Narok 🏍️','ok');
    document.getElementById('r-alert-zone').innerHTML='';
    riderState.collected=false;
    rPanel('delivery', document.querySelector('[data-s="delivery"]'));
}

function declineOrder(){
    if(oTimer) clearInterval(oTimer);
    document.getElementById('r-alert-zone').innerHTML='';
    riderState.activeOrder=null;
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
         ${(o.items||[]).map(i=>`<div>• ${i.name}${i.chickenType?` <strong style="color:var(--red)">[${i.chickenType}]</strong>`:''}${i.note?` <span style="color:var(--orange)">(${i.note})</span>`:''}</div>`).join('')}
        <div class="receipt-note">Show this screen to KFC staff at the counter</div>
      </div>
      <div style="background:var(--dark3);border-radius:var(--r);padding:12px;margin-bottom:12px;font-size:.85rem">
        📍 Deliver to: <strong>${o.customer_area}</strong><br>
        💰 Delivery fee: <strong style="color:var(--green)">Agree with customer</strong> - collect cash at door
      </div>
      ${riderState.collected
        ?`<button class="btn btn-primary btn-full" onclick="showPin()">🔐 Enter Customer PIN</button>`
        :`<button class="btn btn-green btn-full" onclick="markCollected()">✅ Food Collected — Start Delivery</button>`}
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
    riderState.activeOrder=null; riderState.collected=false;
    riderState.todayTrips++; riderState.deliveries++;
    document.querySelectorAll('#s-rider .bnav-btn').forEach(b=>b.classList.toggle('on',b.dataset.s==='home'));
    renderRiderHome();
    toast(`🎉 PIN correct! Collect delivery fee from customer.`,'ok',5000);
     } else {
    for(let i=0;i<4;i++){const el=document.getElementById(`p${i}`); if(el)el.classList.add('err');}
    pinBuf=''; setTimeout(updatePinDisplay,600);
    toast('Wrong PIN. Ask customer to check their SMS.','err');
    }   
 }

 function renderRiderEarnings(){
  const rc=document.getElementById('rider-content');
  rc.innerHTML=`<div style="padding:14px 16px 100px;max-width:468px;margin:0 auto">
    <div class="card">
      <div class="card-t">EARNINGS SUMMARY</div>
      <div style="text-align:center;padding:18px 0">
        <div style="font-family:var(--fh);font-size:3.5rem;color:var(--green);letter-spacing:2px">KES ${riderState.todayEarnings||0}</div>
        <div style="font-size:.82rem;color:var(--muted);margin-top:4px">Today's earnings</div>
      </div>
      <div class="div"></div>
      <div style="display:flex;justify-content:space-between;font-size:.87rem;padding:5px 0"><span style="color:var(--muted)">Per delivery</span><span>KES 100</span></div>
      <div style="display:flex;justify-content:space-between;font-size:.87rem;padding:5px 0"><span style="color:var(--muted)">Today's trips</span><span>${riderState.todayTrips}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:.87rem;padding:5px 0"><span style="color:var(--muted)">Total deliveries</span><span>${riderState.deliveries}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:.87rem;padding:5px 0"><span style="color:var(--muted)">Average rating</span><span style="color:var(--green)">⭐ ${riderState.rating}</span></div>
    </div>
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

function startLocTracking(){
  if(!navigator.geolocation) return;
  setInterval(()=>{
    navigator.geolocation.getCurrentPosition(p=>{
      apiFetch('/api/rider/location',{method:'POST',body:{lat:p.coords.latitude,lng:p.coords.longitude}});
    });
  },60000);
}


// KITCHEN APP
let kInterval=null;

function launchKitchen(){
  screen('s-kitchen');
  startClock();
  kOrders=[];
  if(kInterval) clearInterval(kInterval);
  kInterval=setInterval(pollKitchen,8000); // It runs automatically every 8 seconds so the kitchen board remains fresh, no need to manually refresh
}

function startClock(){
  const tick=()=>{
    const el=document.getElementById('k-clock');
    if(el) el.textContent=new Date().toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Africa/Nairobi'});
  };
  tick(); setInterval(tick,1000);
}

async function pollKitchen(){
  const data=await apiFetch('/api/kitchen/orders');
  if(data?.orders){ kOrders=data.orders; renderKitchen(); } 
} //check data is not null, then access orders //updates the global KOrders with fresh orders from backend  // Redraws the entire kitchen board with updated orders,any status change will reflect immediately.

function renderKitchen(){
  const nw=kOrders.filter(o=>['pending','paid'].includes(o.status));
  const co=kOrders.filter(o=>o.status==='cooking');
  const rd=kOrders.filter(o=>['ready','rider_assigned'].includes(o.status));
  document.getElementById('ks-new').textContent=nw.length;
  document.getElementById('ks-cook').textContent=co.length;
  document.getElementById('ks-rdy').textContent=rd.length;
  document.getElementById('ks-done').textContent=kDone;
  document.getElementById('kc-n').textContent=nw.length;
  document.getElementById('kc-c').textContent=co.length;
  document.getElementById('kc-r').textContent=rd.length;
  document.getElementById('kb-new').innerHTML=nw.length?nw.map(o=>kCard(o,'new')).join(''):'<div class="empty"><div class="ei" style="font-size:2rem">🍗</div><h3 style="font-size:.85rem">NO NEW ORDERS</h3></div>';
  document.getElementById('kb-cook').innerHTML=co.length?co.map(o=>kCard(o,'cook')).join(''):'<div class="empty"><div class="ei" style="font-size:2rem">🔥</div><h3 style="font-size:.85rem">NOTHING COOKING</h3></div>';
  document.getElementById('kb-rdy').innerHTML=rd.length?rd.map(o=>kCard(o,'rdy')).join(''):'<div class="empty"><div class="ei" style="font-size:2rem">📦</div><h3 style="font-size:.85rem">NONE READY</h3></div>';
}

function kCard(o,type){   //Builds a single order card for the kitchen board (order index, type: new, cook or rdy)
  const ageMins=Math.floor((Date.now()-new Date(o.paid_at))/60000); // calculates time in minuted that have passed since the customer paid
  const urgent=ageMins>15&&type!=='rdy';   // two conditions: order waiting time more than 15min, order not in the ready column. Then the order is deemed urgent.
  const action={
    new:`<div style="font-size:.7rem;color:${o.status==='paid'?'var(--green)':'var(--orange)'};margin-bottom:6px">${o.status==='paid'?'✅ PAID':'⏳ AWAITING PAYMENT'}</div>
    <button class="kb cook" onclick="kUpdate(${o.id},'cooking')">🔥 Start Cooking</button>`,
    cook:`<button class="kb rdy" onclick="kUpdate(${o.id},'ready')">✅ Mark Ready</button>`,
    rdy:`<div class="kb wait">${o.status==='rider_assigned'?'🏍️ Rider Assigned':'⏳ Awaiting Rider'}</div>`
  }[type];
  return  `<div class="kc" id="kc-${o.id}">
     <div class="kc-top"><div class="kc-num">${o.order_number}</div><div class="kc-age${urgent?' urg':''}">⏱ ${ageMins}m</div></div>
     <div class="kc-items">${(o.items||[]).map(i=>`<div class="kc-item">${i.name}${i.chickenType?`<span style="background:var(--red);color:#fff;font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:5px">${i.chickenType}</span>`:''} ${i.note?`<div class="kc-note">⚠️ ${i.note}</div>`:''}</div>`).join('')}</div>
    <div class="kc-area">📍 ${o.customer_area||'Narok'}</div>
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
}

function aTab(id,btn){
  document.querySelectorAll('#s-admin .sp').forEach(p=>p.classList.remove('on'));
  document.getElementById(`ap-${id}`)?.classList.add('on');
  if(btn){ document.querySelectorAll('.a-tab').forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
  if(id==='overview') renderAdminOverview();
  else if(id==='orders') renderAdminOrders();
  else if(id==='riders') renderAdminRiders();
  else if(id==='menu') renderAdminMenu();
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
  const recent=[...DEMO_ORDERS_A].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
  document.getElementById('a-recent').innerHTML=recent.map(o=>orderRow(o)).join('');
}

async function renderAdminOrders(){
  const data=await apiFetch('/api/admin/orders');
  const orders=data?.orders||DEMO_ORDERS_A;
  document.getElementById('a-orders').innerHTML=orders.length
    ?orders.map(o=>orderRow(o)).join('')
    :'<div class="empty"><div class="ei">📦</div><h3>NO ORDERS</h3></div>';
}

function orderRow(o){
  const items=(o.items||[]).slice(0,2).map(i=>i.name).join(', ')+(o.items?.length>2?'…':'');
  return `<div class="o-row">
    <div class="or-l">
      <div class="or-num">${o.order_number}</div>
      <div class="or-m">${items} · ${o.customer_area||'Narok'} · ${F.date(o.created_at)}</div>
      </div>
    <div class="or-r">
      <div class="or-p">${F.money(o.food_amount)}</div>
      <span class="badge ${F.badge(o.status)}" style="margin-top:3px">${F.status(o.status)}</span>
    </div>
  </div>`;
}

async function renderAdminRiders(){
  const data=await apiFetch('/api/admin/riders/pending');
  const riders=data||DEMO_RIDERS;

  const getImgUrl = async (path) => {
    if(!path) return null;
    const { data } = await supa.storage.from('rider-docs').createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const riderCards = await Promise.all(riders.map(async r => {
    const idUrl = await getImgUrl(r.id_photo_url);
    const licUrl = await getImgUrl(r.license_photo_url);
    const selfieUrl = await getImgUrl(r.selfie_url);
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

  
     document.getElementById('a-riders').innerHTML=riders.length
    ?riderCards.join('')
     :'<div class="empty"><div class="ei">✅</div><h3>NO PENDING APPLICATIONS</h3><p>All rider applications are reviewed</p></div>';

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


async function renderAdminMenu() {
    const data=await apiFetch('/api/menu');
    const items=data?Object.values(data).flat():Object.entries(MENU).flatMap(([c,items])=>items.map(i=>({...i,category:c,available:true})));
    document.getElementById('a-menu').innerHTML=
    // ADD NEW MENU ITEM
       `<div class="card" style="margin-bottom:14px">
        <div class="card-t">ADD NEW ITEM</div>
        <div class="field" style="margin-bottom:8px">
            <label class="field-lbl">Name</label>
            <input class="inp" id="new-item-name" placeholder="e.g. Spicy Twister"/>
        </div>
        <div class="field" style="margin-bottom:8px">
            <label class="field-lbl">Category</label>
            <select class="inp" id="new-item-cat">
                ${Object.keys(MENU).map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>
        <div class="field" style="margin-bottom:8px">
            <label class="field-lbl">Price (KES)</label>
            <input class="inp" id="new-item-price" type="number" placeholder="e.g. 650"/>
        </div>
        <div class="field" style="margin-bottom:8px">
            <label class="field-lbl">Description</label>
            <input class="inp" id="new-item-desc" placeholder="e.g. Crispy chicken in tortilla wrap"/>
        </div>
        <div class="field" style="margin-bottom:12px">
            <label class="field-lbl">Image URL (optional)</label>
            <input class="inp" id="new-item-img" placeholder="https://..."/>
        </div>
        <button class="btn btn-primary btn-full" onclick="addMenuItem()">+ Add to Menu</button>
    </div>`

    + // Concatenate with the items list
// Items List
 `${items.map(item=>`

     <div class="menu-toggle-item">
      <div class="mt-info">
        <div class="mt-name">${item.name}</div>
        <div class="mt-cat">${item.category}</div>
      </div>
      <div class="mt-price">${F.money(item.price)}</div>
      <div class="toggle-sm${item.available?' on':''}" id="mt-${item.id}" onclick="toggleMenuItem(${item.id},this)"></div>
    </div>`).join('')}`;
}


async function addMenuItem() {
    const name = document.getElementById('new-item-name')?.value.trim();
    const category = document.getElementById('new-item-cat')?.value;
    const price = document.getElementById('new-item-price')?.value.trim();
    const img = document.getElementById('new-item-img')?.value.trim();
    const description = document.getElementById('new-item-desc')?.value.trim();

    if(!name || !price){ toast('Name and price are required','err'); return; }
    const result = await apiFetch('/api/menu', {
      method: 'POST',
      body: { name, category, price, description, img }
    });

    if(result?.success) {
      toast(`✅ ${name} added to menu!`, 'ok');
       // Clear the form
        document.getElementById('new-item-name').value = '';
        document.getElementById('new-item-price').value = '';
        document.getElementById('new-item-desc').value = '';
        document.getElementById('new-item-img').value = '';
        // Refresh the menu list
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

// RESTORE SESSION
document.addEventListener('DOMContentLoaded', async () => {
  const saved = localStorage.getItem('kfc_user');
  if(saved){ try{ user=JSON.parse(saved); }catch{} }


  // check for existing Supabase admin session
  const { data: { session}} = await supa.auth.getSession();
  if(session){
    role ='admin';
    launchAdmin();
  }
});


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
    role = null;
    screen('s-landing');
    toast('signed out');
}

// SUPABASE REALTIME — KITCHEN
function startKitchenRealtime(){
  // Remove any existing channel first
  supa.channel('kitchen-orders').unsubscribe().catch(()=>{});
  supa.channel('kitchen-orders')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},()=>{
      pollKitchen(); playBeep();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},()=>{
      pollKitchen();
    })
    .subscribe(status=>{
      if(status==='SUBSCRIBED') console.log('[Realtime] kitchen subscribed');
    });
}

// SUPABASE REALTIME - RIDER (receives order dispatches)

function startRiderRealtime(){
  const phone=riderState.phone||user.phone;
  if(!phone) return;

  // Unsubscribe existing channels
  supa.channel('rider-dispatch').unsubscribe().catch(()=>{});

  // Listen for broadcast dispatch events from the backend
  supa.channel('rider-dispatch')
    .on('broadcast',{event:'new_order'},({payload})=>{
      if(!riderState.online||riderState.activeOrder) return;
      riderState.activeOrder=payload;
      if(document.getElementById('s-rider')?.classList.contains('on')){
        renderRiderHome();
        showRiderOrderAlert(payload);
        playBeep();
      }
    })
    .subscribe();

  // Also watch for direct assignment on orders table
  supa.channel('rider-assigned-'+phone)
    .on('postgres_changes',{
      event:'UPDATE', schema:'public', table:'orders',
      filter:`rider_phone=eq.${phone}`
    },({new:o})=>{
      if(o.status==='rider_assigned'&&!riderState.activeOrder){
        riderState.activeOrder=o;
        renderRiderHome();
        showRiderOrderAlert(o);
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
    .subscribe();
}

// RIDER ↔ CUSTOMER CHAT  (delivery fee negotiation)
// Uses Supabase Realtime broadcast — no extra DB table required.
// Channel name: order-chat-{orderId}

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


function openChat(orderId, myRole){
  ensureChatSheet();
  chatOrderId=orderId; chatMyRole=myRole; chatMsgs=[];
  renderChatMessages();

  // Quick-suggestion buttons (rider only)
  const qb=document.getElementById('chat-quick-btns');
  if(myRole==='rider'){
    qb.innerHTML=['KES 50','KES 100','KES 150','KES 200','KES 300','KES 500'].map(fee=>
      `<button class="btn btn-ghost btn-sm" style="font-size:.75rem" onclick="quickFee('${fee}')">${fee}</button>`
    ).join('');
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
      chatMsgs.push(payload);
      renderChatMessages();
      playBeep();
    })
    .subscribe();

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
  chatMsgs.push(msg);
  renderChatMessages();
  // Broadcast to the other side
  if(chatChannel){
    await chatChannel.send({type:'broadcast', event:'msg', payload:msg});
  }
}

function renderChatMessages(){
  const el=document.getElementById('chat-msgs');
  if(!el) return;
  if(!chatMsgs.length){
    el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:.82rem;padding:20px 0">No messages yet — say hello! 👋</div>';
    return;
  }
  el.innerHTML=chatMsgs.map(m=>{
    const isMine=m.role===chatMyRole;
    const time=new Date(m.ts).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
    return `<div style="display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'}">
      <div style="font-size:.68rem;color:var(--muted);margin-bottom:2px">${m.name} · ${time}</div>
      <div style="background:${isMine?'var(--red)':'var(--dark3)'};color:var(--white);padding:9px 13px;border-radius:${isMine?'14px 14px 2px 14px':'14px 14px 14px 2px'};max-width:80%;font-size:.87rem;word-break:break-word">${m.text}</div>
    </div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}
