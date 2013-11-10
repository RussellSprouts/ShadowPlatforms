"use strict";
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
ctx.fillStyle='white';
ctx.strokeStyle='green';
ctx.lineWidth = 2;
var width = canvas.width;
var height = canvas.height;
var gravity = 10;
var ballCount = 0;
var ITERATION_COUNT = 3;
var player;


var PLAYER_SPEED = 5;
var RADIUS = 4;
var X = 0;
var Y = 1;
var OLD_X = 2;
var OLD_Y = 3;
var JUMP_GRACE_PERIOD = 5;

var mouseX = 0;
var mouseY = 0;

var aIsPressed = false;
var sIsPressed = false;
var wIsPressed = false;
var dIsPressed = false;

var mouseD = false;

keypress.register_combo({
    "keys"              : "a",
    "on_keydown"        : function(){aIsPressed = true;},
    "on_keyup"          : function(){aIsPressed = false;},
});
keypress.register_combo({
    "keys"              : "s",
    "on_keydown"        : function(){sIsPressed = true;},
    "on_keyup"          : function(){sIsPressed = false;},
});

keypress.register_combo({
    "keys"              : "d",
    "on_keydown"        : function(){dIsPressed = true;},
    "on_keyup"          : function(){dIsPressed = false;},
});

keypress.register_combo({
    "keys"              : "w",
    "on_keydown"        : function(){wIsPressed = 20;},
    "on_keyup"          : function(){wIsPressed = false;},
});


function drawCircle(){
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, Math.PI*2, true); 
  ctx.closePath();
  ctx.fill();
}

function acceleration(b, t){
  var x = 0;
  var y = gravity;
  if( aIsPressed ){
    x = -PLAYER_SPEED;
  } else if( dIsPressed ){
    x = PLAYER_SPEED;
  }
  
  if( wIsPressed && player.onGround > 0 ){
    y = -30*PLAYER_SPEED;
  }
  return [x, y];
}

function integrateVerlet(b, t, dt){
  var x = b.x;
  var y = b.y;
  var tempX = b.x;
  var tempY = b.y;
  var oldX = b.adjustedox ? b.adjustedox : b.ox;
  var oldY = b.adjustedoy ? b.adjustedoy : b.oy;
  var a = acceleration(b, t);
  var ax = a[0];
  var ay = a[1];
  b.x += 0.99*x-0.99*oldX+ax*dt*dt;
  b.y += 0.99*y-0.99*oldY+ay*dt*dt;
  b.ox = tempX;
  b.oy = tempY;
  b.adjustedox = b.ox;
  b.adjustedoy = b.oy;
}

function satisfyConstraints(dynamicObjects, t){
  for( var iterations = 0; iterations < ITERATION_COUNT; iterations++ ){
    for( var a = 0; a<dynamicObjects.length; a++ ){
      for( var b = 0; b<staticObjects.length; b++ ){
        var doA = dynamicObjects[a];
        var soB = staticObjects[b];
        var coords = soB.collide(doA);
        if( coords ){
          doA.x = coords[0];
          doA.y = coords[1];
		  if(coords[2]){
		  doA.adjustedox = coords[2];
		  doA.adjustedoy = coords[3];
		  }
		  if( !aIsPressed && !dIsPressed ){
			  //doA.ox = doA.x;
			  //doA.oy = doA.y;
		  }
        }
      }
    }
    /*
    for( var a = 0; a<dynamicObjects.length; a++ ){
      for( var b = 0; b<dynamicObjects.length; b++ ){
        if( a != b ){
          var x1 = dynamicObjects[a].x;
          var x2 = dynamicObjects[b].x;
          var y1 = dynamicObjects[a].y;
          var y2 = dynamicObjects[b].y;
          var deltaX = x2 - x1;
          var deltaY = y2 - y1;
          var restLength = dynamicObjects[a].r + dynamicObjects[b].r;
          if( deltaX < restLength && deltaY < restLength ){
            var deltaLength = Math.sqrt(deltaX*deltaX+deltaY*deltaY);
            if( deltaLength < restLength ){
              var diff = (deltaLength-restLength)/deltaLength;
              dynamicObjects[a].x += deltaX*0.5*diff;
              dynamicObjects[a].y += deltaY*0.5*diff;
              dynamicObjects[b].x -= deltaX*0.5*diff;
              dynamicObjects[b].y -= deltaY*0.5*diff;
            }
          }
        }
      }
    }*/
  }
}
    
function Ball(){
  this.x = Math.random()*width;
  this.y = Math.random()*height;
  this.r = Math.random()*15+4;
  this.ox = this.x + Math.random()*16-8;
  this.oy = this.y + Math.random()*16-8;
  this.draw = drawCircle;
  this.hit = [];
}

var dynamicObjects = [];
var staticObjects = [];

function Line(startX, startY, endX, endY){
  this.ax = startX
  this.ay = startY
  this.bx = endX
  this.by = endY
  this.draw = drawLine;
  this.collide = collideLine;
}

function drawLine(){
  ctx.beginPath();
  ctx.moveTo(this.ax, this.ay);
  ctx.lineTo(this.bx, this.by);
  ctx.stroke();
}

function collideLine(dyn){
  var ax = this.ax, bx = this.bx, ay = this.ay, by = this.by;
  var oldTLx = dyn.ox, oldTRx = dyn.ox+dyn.width, oldBLx = dyn.ox, oldBRx = dyn.ox+dyn.width;
  var oldTLy = dyn.oy, oldTRy = dyn.oy, oldBLy = dyn.oy+dyn.height, oldBRy = dyn.oy+dyn.height;
  var newTLx = dyn.x, newTRx = dyn.x+dyn.width, newBLx = dyn.x, newBRx = dyn.x+dyn.width;
  var newTLy = dyn.y, newTRy = dyn.y, newBLy = dyn.y+dyn.height, newBRy = dyn.y+dyn.height;
  var isInBoundingBoxX, isInBoundingBoxY;
  
  var lowerx = Math.min(ax,bx);
  var higherx = Math.max(ax,bx);
  isInBoundingBoxX = (dyn.x >= lowerx && dyn.x <= higherx) || (lowerx >= dyn.x && lowerx <= dyn.x+dyn.width) || (higherx >= dyn.x && higherx <= dyn.x+dyn.width);
  var lowery = Math.min(ay,by);
  var highery = Math.max(ay,by);
  isInBoundingBoxY = (dyn.y >= lowery && dyn.y <= highery) || (lowery >= dyn.y && lowery <= dyn.y+dyn.height) || (highery >= dyn.y && highery <= dyn.y+dyn.height);
  
  if( isInBoundingBoxX && isInBoundingBoxY ){
	  if( crossProduct(ax,ay,bx,by,oldTLx,oldTLy) >= 0 && crossProduct(ax,ay,bx,by,oldTRx,oldTRy) >= 0 &&
		  crossProduct(ax,ay,bx,by,oldBLx,oldBLy) >= 0 && crossProduct(ax,ay,bx,by,oldBRx,oldBRy) >= 0 &&
		 (crossProduct(ax,ay,bx,by,newTLx,newTLy) < 0 || crossProduct(ax,ay,bx,by,newTRx,newTRy) < 0 ||
		  crossProduct(ax,ay,bx,by,newBLx,newBLy) < 0 || crossProduct(ax,ay,bx,by,newBRx,newBRy) < 0) ){
		if( (ax < bx && ay > by) || (ay == by && ax < bx) ){
			ctx.fillStyle='green';
			ctx.strokeStyle='black'
			return vectorProjection(ax,ay,bx,by,oldTLx,oldTLy,newTLx,newTLy);
		} else if( ax < bx && ay < by ){
			var coord = intersection(ax,ay,bx,by,oldTRx,oldTRy,newTRx,newTRy);
			ctx.fillStyle='yellow';
			ctx.strokeStyle='black'
			dyn.onGround = 0;
			coord[0] -= dyn.width + 1;
			return coord;
		} else if( (ax > bx && ay < by)  ){
			var coord = intersection(ax,ay,bx,by,oldBRx,oldBRy,newBRx,newBRy);
			coord[0] -= dyn.width + 1;
			coord[1] -= dyn.height + 1;
			dyn.onGround = JUMP_GRACE_PERIOD;
			ctx.fillStyle='blue';
			ctx.strokeStyle='black'
			return coord;
		} else if( (ax == bx && ay < by) ){
			var coord = intersection(ax,ay,bx,by,oldBRx,oldBRy,newBRx,newBRy);
			coord[0] -= dyn.width + 1;
			coord[1] -= dyn.height + 1;
			ctx.fillStyle='#00ffff';
			ctx.strokeStyle='black'
			return coord;
		} else if( (ax > bx && ay >= by) ){
			var coord = intersection(ax,ay,bx,by,oldBLx,oldBLy,newBLx,newBLy);
			coord[1] -= dyn.height + 1;
			ctx.fillStyle='red';
			ctx.strokeStyle='black'
			dyn.onGround = JUMP_GRACE_PERIOD;
			return coord;
		} else if( ax == bx && ay>= by ) {
			var coord = intersection(ax,ay,bx,by,oldBLx,oldBLy,newBLx,newBLy);
			coord[1] -= dyn.height + 1;
			ctx.fillStyle='brown';
			ctx.strokeStyle='black'
			return coord;
		}
	  } 
  }
}

function crossProduct(ax, ay, bx, by, px, py){
  return ((bx - ax)*(py - ay)-(by-ay)*(px-ax));
}

function crossProduct2D(x1,y1,x2,y2){
  return x1*y2 - y1*x2;
}

function intersection(ax, ay, bx, by, poldx, poldy, pnewx, pnewy){
  var coords = vectorProjection(bx-ax,by-ay,pnewx-poldx,pnewy-poldy);
  console.log(coords);
  return [poldx + coords[0] * .99, poldy + coords[1] * .99];

/*  var denom = crossProduct2D(pnewx-poldx,pnewy-poldy,bx-ax,by-ay)
  if (denom == 0) {
    return [poldx,poldy];
  }
  var t = crossProduct2D(ax-poldx,ay-poldy,bx-ax,by-ay) / denom;
  var ix = poldx + t*(pnewx-poldx);
  var iy = poldy + t*(pnewy-poldy);
  var coord = vectorProjection(ax,ay,bx,by,pnewx - poldx,pnewy - poldy);
  var fx = coord[0] - ix;
  var fy = coord[1] - iy;
  console.log(fx,fy);
  fx*=.5;
  fy*=.5;
  return [ix, iy]; */
}

function vectorProjection(bx,by,px,py){
  var magAB = (bx)*(bx) + (by)*(by);
  if (magAB == 0) {
    return [0,0];
  }
  return [((px*(bx*bx)) / magAB) + ((py*(by*bx)) / magAB),
          ((py*(bx*by)) / magAB) + ((py*(by*by)) / magAB)];
}

function drawPlayer(){
  ctx.fillRect(this.x, this.y, this.width, this.height);
  ctx.strokeRect(this.ox, this.oy, this.width, this.height);
}

function Player(){
  this.draw = drawPlayer;
  this.height = 35;
  this.width = 15;
  this.x = 100;
  this.y = 100;
  this.oy = 100;
  this.ox = 100;
}

dynamicObjects[0] = new Player();
player = dynamicObjects[0];
staticObjects[0] = new Line(200,200,100,200);
staticObjects[1] = new Line(400,400,300,300);
staticObjects[2] = new Line(300,300,200,300);
staticObjects[7] = new Line(100,100,200,200);
staticObjects[8] = new Line(500,400,400,400);
staticObjects[9] = new Line(600,100,500,120);
staticObjects[10] = new Line(400,450,550,400);

staticObjects[3] = new Line(10,10,600,10);
staticObjects[4] = new Line(600,600,10,600);
staticObjects[5] = new Line(600,10,600,600);
staticObjects[6] = new Line(10,600,10,10);



canvas.mouseDown = function(){
  mouseD = true;
}
canvas.mouseUp = function(){
  mouseD = false;
}

var oldT = 0;
function callback(t){
  ctx.fillStyle='purple';
  ctx.strokeStyle='purple'
  var dt = 16;
  if( wIsPressed ){
    //dynamicObjects[0].oy += .1;
  }
  player.onGround--;
  for( var i = 0; i<dynamicObjects.length; i++ ){
    integrateVerlet(dynamicObjects[i], t, dt/100);
    satisfyConstraints(dynamicObjects, t);
  }
  ctx.clearRect(0,0,width,height);
  for( var i = 0; i<dynamicObjects.length; i++ ){
    dynamicObjects[i].draw();
  }
  for( var i = 0; i<staticObjects.length; i++ ){
    staticObjects[i].draw();
  }
  oldT = t;
  window.requestAnimationFrame(callback);
}

window.requestAnimationFrame(callback);
