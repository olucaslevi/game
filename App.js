import React, { Component } from 'react';
import io from 'socket.io-client';
import { useState,useEffect, useRef } from 'react';
// importin three
import * as THREE from 'three';
// importing cannon to physics
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// importing class player
import Player from './src/Components/player.js';
// import chat.js
import { World } from 'cannon-es';

const socket = io.connect("http://142.93.15.138:80");

let currentPlayer;
let color;
export function App() {
   const [name, setName] = useState("");
   const [user, setUser] = useState(null);
   const [message, setMessage] = useState("");
   const [messages, setMessages] = useState([]);
   const [players, setPlayers] = useState([]);
   var otherPlayers = [], otherPlayersId = [];
   var player, playerId, moveSpeed, turnSpeed;
   var playerData;
   var sphere;
   var keyState = {};
   var objects = [];
   // ? Chatbox Stuff
   

   function log (text,autor,color){
      // document.getElementById("usernameError").innerHTML = `<span style='${color}'>**Message</span>`;
      const parent = document.getElementById("chat-list");
      const el = document.createElement('li'); // Create a <li> node num <ul>
      el.innerHTML = `<span style='color: ${color}'>${autor}: </span> ${text}`;
      parent.appendChild(el); // appends the <li> node to the <ul> node
      parent.scrollTop = parent.scrollHeight; // scrolls the chat box to the bottom
   }


   useEffect(() => {
      socket.on('connect', function(){
         init(); // this 
         // pedir outros jogadores conectados
         socket.emit('requestOldPlayers', {});
         socket.emit('update',{});
         // se enviar p/ ser atualizado nos outros jogadores
      });
      
      function init () {
         const scene = new THREE.Scene(); /// creating scene
         const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
         const renderer = new THREE.WebGLRenderer();

         const physicsWorld = new CANNON.World({ /// this is the physics world, it will be used to add physics to the objects
            gravity: new CANNON.Vec3(0, -10, 0),
            frictionGravity: 0.5,
         });

         // Create a slippery material (friction coefficient = 0.0)
         const physicsMaterial = new CANNON.Material('physics') //  physics material for the ground
         const physics_physics = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
            friction: 0.0,
            restitution: 0.3,
            
         })
         // We must add the contact materials to the world
         physicsWorld.addContactMaterial(physics_physics)
         const groundBody = new CANNON.Body({
            mass: 0,
            material: physicsMaterial,
            shape: new CANNON.Plane(),
            type: CANNON.Body.STATIC
         });
         groundBody.position.set(0, -0.5, 0);
         groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // * rotate the ground
         physicsWorld.addBody(groundBody);

         // ? This is to see the lines of the physics world

         const cannonDebugger = new CannonDebugger(scene, physicsWorld);

         // * adding grid to scene
         scene.add( new THREE.GridHelper( 100, 100 ) );
         

         // *size, intensity, distance, decay
         renderer.setSize(window.innerWidth/1.3, window.innerHeight/1.3);
         document.body.appendChild(renderer.domElement);
         const controls = new OrbitControls(camera, renderer.domElement);
         controls.target.set(0, 10, 0);

         // socket.on('message', (message, autor) => {
         //    log(message, autor, currentPlayer.color);
         // });
         // * test 
         //Sphere------------------

         var createPlayer = function(data){

            playerData = data;
      
            var cube_geometry = new THREE.BoxGeometry(data.sizeX, data.sizeY, data.sizeZ);
            var cube_material = new THREE.MeshBasicMaterial({color: 0x7777ff, wireframe: false});
            player = new THREE.Mesh(cube_geometry, cube_material);
      
            player.rotation.set(0,0,0);
      
            player.position.x = data.x;
            player.position.y = data.y;
            player.position.z = data.z;
      
            playerId = data.playerId;
            moveSpeed = data.speed;
            turnSpeed = data.turnSpeed;
      
      
            objects.push( player );
            scene.add( player );
      
            camera.lookAt( player.position );
         };
         socket.on('createPlayer', function(data){
            createPlayer(data);
         });

         socket.on('removeOtherPlayer', function(data){
            removeOtherPlayer(data);
         });
         var updatePlayerPosition = function(data){

            var somePlayer = playerForId(data.playerId);
            if(somePlayer){
               somePlayer.position.x = data.x;
               somePlayer.position.y = data.y;
               somePlayer.position.z = data.z;

               somePlayer.rotation.x = data.r_x;
               somePlayer.rotation.y = data.r_y;
               somePlayer.rotation.z = data.r_z;
            }
         };
         socket.on('updatePosition', function(data){
            updatePlayerPosition(data);
         });
            var updatePlayerData = function(){
               playerData.x = player.position.x;
               playerData.y = player.position.y;
               playerData.z = player.position.z;

               playerData.r_x = player.rotation.x;
               playerData.r_y = player.rotation.y;
               playerData.r_z = player.rotation.z;

         };
        
         var addOtherPlayer = function(data){ 
            var cube_geometry = new THREE.BoxGeometry(data.sizeX, data.sizeY, data.sizeZ);
            var cube_material = new THREE.MeshBasicMaterial({color: 0x7777ff, wireframe: false});
            var otherPlayer = new THREE.Mesh(cube_geometry, cube_material);

            otherPlayer.position.x = data.x;
            otherPlayer.position.y = data.y;
            otherPlayer.position.z = data.z;

            otherPlayersId.push( data.playerId );
            otherPlayers.push( otherPlayer );
            objects.push( otherPlayer );
            scene.add( otherPlayer );
            console.log("other player added");

         };

         socket.on('addOtherPlayer', function(data){
            console.log('info q chega do server é:',data)
            addOtherPlayer(data);
         });

         socket.on('update', (data) => {
            addOtherPlayer(data);
         });
         
         var removeOtherPlayer = function(data){
            scene.remove( playerForId(data.playerId) );
         };

         var playerForId = function(id){
            var index;
            for (var i = 0; i < otherPlayersId.length; i++){
               if (otherPlayersId[i] == id){
                  index = i;
                  break;
               }
            }
            return otherPlayers[index];
         };
         // * adding player to scene

         // ? player physics body
         var playerShape = new CANNON.Box(new CANNON.Vec3(1,1,1));
         var playerBody = new CANNON.Body({
            mass: 1,
            material: physicsMaterial,
            shape: playerShape,
            type: CANNON.Body.DYNAMIC
         });
         // ? player mesh
         let playerMesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshBasicMaterial({ color: 'blue' }) // set opacity to 0

         );
         // ? light
         const light2 = new THREE.DirectionalLight(0xffffff, 1);
         light2.position.set(0, 1, 0);
         scene.add(light2);

         // ? Texture from ground plane
         let planesize = 100;
         // load a texture, set wrap mode to repeat
         const texture = new THREE.TextureLoader().load( 'https://threejsfundamentals.org/threejs/resources/images/checker.png' );
         texture.wrapS = THREE.RepeatWrapping;
         texture.wrapT = THREE.RepeatWrapping;
         const repeats = planesize/2;
         // do not blur texture
         texture.magFilter = THREE.NearestFilter;
         texture.repeat.set( repeats, repeats );
         
         // ? Plane Ground
         const planeGeometry = new THREE.PlaneGeometry(100, 100, 10, 10);
         // soft green collor: 0x44aa88
         const planeMaterial = new THREE.MeshBasicMaterial({map:texture, side: THREE.DoubleSide});
         const plane = new THREE.Mesh(planeGeometry, planeMaterial);
         plane.receiveShadow = true;
         plane.rotation.x = -0.5 * Math.PI;
         plane.position.y = -0.5;
         scene.add(plane);
         
         // ? set background soft blue: 0x44aaff
         scene.background = new THREE.Color(0x44aaff);
         
         // ? draw FPS
         const stats = new Stats();
         document.body.appendChild(stats.dom);
         
         // * camera lookAt
         camera.lookAt(0,0,0);
         // * camera update
         camera.updateProjectionMatrix();
         
         camera.position.z = 18;
         camera. position.y = 10;
         // camera rotation
         camera.rotation.z = 50;

         // ? show x,y,z lines in scene
         const axesHelper = new THREE.AxesHelper( 50 );
         scene.add( axesHelper );


         // ! DRAW THE PLAYER NAME IN 2D.
         const canvas = document.createElement('canvas');
         const context = canvas.getContext('2d');
         context.font = 'Bold 28px Arial';
         context.fillRect(0,0,0,300);
         const textureText = new THREE.CanvasTexture(canvas);
         const spriteMaterial = new THREE.SpriteMaterial({ map: textureText });
         const sprite = new THREE.Sprite(spriteMaterial);
         sprite.scale.set(10, 5, 1.0);

         // * wasd movement
         document.addEventListener('keydown', (event) => {
            const keyName = event.key;
            if (keyName === 'w') {
               // up arrow or 'w' - move forward
               player.position.x -= moveSpeed * Math.sin(player.rotation.y);
               player.position.z -= moveSpeed * Math.cos(player.rotation.y);
               updatePlayerData();
               socket.emit('updatePosition', playerData);
            }
            if (keyName === 's') {
                           // down arrow or 's' - move backward
               player.position.x += moveSpeed * Math.sin(player.rotation.y);
               player.position.z += moveSpeed * Math.cos(player.rotation.y);
               updatePlayerData();
               socket.emit('updatePosition', playerData);
            }
            if (keyName === 'a') {
               // left arrow or 'a' - rotate left
               player.position.x -= moveSpeed;
               updatePlayerData();
               socket.emit('updatePosition', playerData);
            }
            if (keyName === 'd') {
                           // right arrow or 'd' - rotate right
               player.position.x += moveSpeed;
               updatePlayerData();
               socket.emit('updatePosition', playerData);
            }
            if (keyName === ' ') {
               console.log('pulou');
            }
         }); //keydown
         // document.addEventListener('keyup', (event) => {
         //    const keyName = event.key;
         //    if (keyName === 'w') {
         //       playerBody.velocity.z = 0;
         //    }
         //    if (keyName === 's') {
         //       playerBody.velocity.z = 0;

         //    }
         //    if (keyName === 'a') {
         //       playerBody.velocity.x = 0;
         //    }
         //    if (keyName === 'd') {
         //       playerBody.velocity.x = 0;
         //    }
         // }); //keyup


         const update = () => { 
            // * update camera
            camera.updateProjectionMatrix();
            // * update controls
            controls.update();
            // * update stats
            stats.update();
            // * update cannonDebugger
            cannonDebugger.update();
            // * update physicsWorld
            physicsWorld.step(1/60);
            // * update player username position
            sprite.position.copy(playerBody.position);
            sprite.position.y += 3.4;

         };
         const animate = () => { // animation loop
            update();
            physicsWorld.fixedStep();
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
         }
         animate();
      }

    }, []);


   function handleChange(event) {
      setName(event.target.value);
      console.log(name);
   }


   function handleClick() { // envio apenas o username
      // if (name != "") {
      //    if (name.length > 3 && name.length < 10) {
      //       socket.emit('newPlayer', name);
      //       document.getElementById("username").style.display = "none";
      //       document.getElementById("buttonSubmit").style.display = "none";
      //    }else{
      //       alert("Nome muito curto");
      //    }
      // }else{
      //    alert("Nome inválido");
      // }
   }
   function handleExit() {
      
   }
   function handleMessageChange(event) {
      setMessage(event.target.value);
   }
   function handleSendMessage(e) {
      e.preventDefault();
      socket.emit('message', message, name);
      // set value to empty
      console.log(message)
      document.getElementById("chat").value = "";  
   }
   
   
   return (
      
      <div className="App">
         <header className="App-header" z-index="15000   ">
            <h1>Game</h1>
            
            <div>
               <label>Digite um nome </label><br/>
               <input id="username" type='text' maxLength={12} placeholder='username' onChange={handleChange}></input><br/>
               <button id="buttonSubmit" type='submit' onClick={handleClick}>Fazer Login</button>
            </div>
            <div id="root">
               <div id="chat-div">
                    <ul id="chat-list"></ul>
                    <form id="chat-form">
                        <input type="text" id="chat" autoComplete="off" onChange={handleMessageChange}/>
                        <button type="click" id="submit" onClick={handleSendMessage}>Send</button>
                        <button type="submit" id="btnSair" onClick={handleExit} >Sair</button>
                    </form>
                </div>
            </div>
         </header>
      </div>
      
   );
}
export default App; 
