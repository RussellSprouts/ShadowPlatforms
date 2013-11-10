var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
ctx.fillStyle='black';
ctx.strokeStyle='blue';
ctx.lineWidth = 2;
var width = canvas.width;
var height = canvas.height;
var gravity = 10;
var ballCount = 10;
var ITERATION_COUNT = 3;

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
  
  if( wIsPressed ){
    y = -PLAYER_SPEED;
  }
  return [x, y];
}

function integrateVerlet(b, t, dt){
  var x = b.x;
  var y = b.y;
  var tempX = b.x;
  var tempY = b.y;
  var oldX = b.ox;
  var oldY = b.oy;
  var a = acceleration(b, t);
  var ax = a[0];
  var ay = a[1];
  b.x += 0.99*x-0.99*oldX+ax*dt*dt;
  b.y += 0.99*y-0.99*oldY+ay*dt*dt;
  b.ox = tempX;
  b.oy = tempY;
}

function satisfyConstraints(dynamicObjects, t){
  for( var iterations = 0; iterations < ITERATION_COUNT; iterations++ ){
    for( var i = 0; i<dynamicObjects.length; i++ ){
      var b = dynamicObjects[i];
      if( b.y > height - b.height ){
        var normal = b.y - height + b.height; 
        b.frictionY = normal;
      }
      b.x = Math.max(b.width, Math.min(b.x, width-b.width));
      b.y = Math.max(b.height, Math.min(b.y, height-b.height));
    }
    for( var a = 0; a<dynamicObjects.length; a++ ){
      for( var b = 0; b<dynamicObjects.length; b++ ){
        if( a!= b ){
        
        }
      }
      for( var b = 0; b<staticObjects.length; b++ ){
        var doA = dynamicObjects[a];
        var soB = staticObjects[b];
        var coords = soB.collide(doA);
        if( coords ){
          doA.x = coords[0];
          doA.y = coords[1];
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
for( var i = 0; i<ballCount; i++ ){
  dynamicObjects[i] = new Ball();
}

function drawTile(){
  ctx.fillRect(this.x, this.y, this.width, this.height);
}

function collideTop(doA){
  
}


function collideSolidTile(doA){
  if( (doA.x <= this.x + this.width && doA.x + doA.width >= this.x) && (doA.y <= this.y + this.height && doA.y + doA.height >= this.y) ){
    var dcx = (doA.x + doA.width/2) - (this.x + this.width/2);
    var dcy = (doA.y + doA.height/2) - (this.y + this.height/2);
    var dx = 0;
    var dy = 0;
    if( dcx > 0 ){
      dx = this.x + this.width - doA.x;
    } else {
      dx = this.x - doA.width - doA.x;
    }
    if( dcy > 0 ){
      dy = this.y + this.height - doA.y;
    } else {
      dy = this.y - doA.height - doA.y;
    }
    if( Math.abs(dy) < Math.abs(dx) && Math.abs(dx) > 1 ){
      return [doA.x, doA.y + dy];
    } else if( Math.abs(dy) > 1 ){
      return [doA.x + dx, doA.y];
    }
  } else {
    return false;
  }
}


function SolidTile(x, y){
  this.draw = drawTile;
  this.collide = collideSolidTile;
  this.width = 20;
  this.height = 20;
  this.x = x;
  this.y = y;
}

function collideSlopedTile(doA){
  //collides with center of the player.
  if( (doA.x < this.x + this.width && doA.x + doA.width > this.x) && (doA.y < this.y + this.height && doA.y + doA.height > this.y) ){
    var dcx = (doA.x + doA.width/2) - (this.x + this.width/2);
    var dcy = (doA.y + doA.height/2) - (this.y + this.height/2);
    var dx = 0;
    var dy = 0;
    if( dcx > 0 ){
      dx = this.x + this.width - doA.x;
    } else {
      dx = this.x - doA.width - doA.x;
    }
    if( dcy > 0 ){
      dy = this.y + this.height - doA.y;
    } else {
      dy = this.y - doA.height - doA.y;
    }
    if( Math.abs(dy) < Math.abs(dx) ){
      return [doA.x, doA.y + dy];
    } else {
      return [doA.x + dx, doA.y];
    }
  } else {
    return false;
  }
}

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
  var highery = Math.min(ay,by);
  isInBoundingBoxY = (dyn.y >= lowery && dyn.y <= highery) || (lowery >= dyn.y && lowery <= dyn.y+dyn.height) || (highery >= dyn.y && highery <= dyn.y+dyn.height);
  
  if( isInBoundingBoxX && isInBoundingBoxY ){
	  if( crossProduct(ax,ay,bx,by,oldTLx,oldTLy) >= -.1 && crossProduct(ax,ay,bx,by,oldTRx,oldTRy) >= -.1 &&
		  crossProduct(ax,ay,bx,by,oldBLx,oldBLy) >= -.1 && crossProduct(ax,ay,bx,by,oldBRx,oldBRy) >= -.1 &&
		  (crossProduct(ax,ay,bx,by,newTLx,newTLy) <= .1 || crossProduct(ax,ay,bx,by,newTRx,newTRy) <= .1 ||
		   crossProduct(ax,ay,bx,by,newBLx,newBLy) <= .1 || crossProduct(ax,ay,bx,by,newBRx,newBRy) <= .1) ){
		if( (ax < bx && ay > by) || (ay == by && ax < bx) ){
			return vectorProjection(ax,ay,bx,by,newTLx,newTLy);
		} else if( ax < bx && ay < by ){
			var coord = vectorProjection(ax,ay,bx,by,newTRx,newTRy);
			coord[0] -= dyn.width;
			return coord;
		} else if( (ax > bx && ay < by) || (ax == bx && ay < by) ){
			var coord = vectorProjection(ax,ay,bx,by,newBRx,newBRy);
			coord[0] -= dyn.width;
			coord[1] -= dyn.height;
			dyn.onGround = JUMP_GRACE_PERIOD;
			return coord;
		} else if( (ax >= bx && ay >= by) ){
			var coord = vectorProjection(ax,ay,bx,by,newBLx,newBLy);
			coord[1] -= dyn.height;
			ctx.fillStyle='red';
			dyn.onGround = JUMP_GRACE_PERIOD;
			return coord;
		}
	  } 
  }
}

function crossProduct(ax, ay, bx, by, px, py){
  return ((bx - ax)*(py - ay)-(by-ay)*(px-ax));
}

function vectorProjection(ax,ay,bx,by,px,py){
  var magAB = (bx - ax)*(bx - ax) + (by - ay)*(by - ay);
  px = px - ax;
  py = py - ay;
  return [((px*((bx - ax)*(bx - ax))) / magAB) + ((py*((by - ay)*(bx - ax))) / magAB) + ax,
          ((py*((bx - ax)*(by - ay))) / magAB) + ((py*((by - ay)*(by - ay))) / magAB) + ay];
}

function drawSlopedTile(){
  ctx.beginPath();
  ctx.moveTo(this.x, this.y+this.height); 
  ctx.lineTo(this.x, this.y + this.height - this.startY);
  ctx.lineTo(this.x+this.width, this.y + this.height - this.endY);
  ctx.lineTo(this.x+this.width, this.y + this.height);
  ctx.closePath();
  ctx.fill();
}


function SlopedTile(x,y, startY, endY){
  this.draw = drawSlopedTile;
  this.collide = collideSolidTile;
  this.width = 20;
  this.startY = startY;
  this.endY = endY;
  this.height = 20;
  this.x = x;
  this.y = y;
}

function collideBottomlessTile(doA){
  if( this.y >= doA.oy + doA.height && (doA.y + doA.height >= this.y) && (doA.x < this.x + this.width && doA.x + doA.width > this.x) ){
    var dcx = (doA.x + doA.width/2) - (this.x + this.width/2);
    var dcy = (doA.y + doA.height/2) - (this.y + this.height/2);
    //doA.oy = this.y + this.height - 10
      //if( dcy > 0 ){
        //return [doA.x, this.y + this.height];
      //} else {
        return [doA.x, this.y - doA.height];
      //}
  } else {
    return false;
  }
}

function drawBottomlessTile(){
  ctx.fillRect(this.x, this.y, this.width, this.height/4);
}

function BottomlessTile(x,y){
  this.draw = drawBottomlessTile;
  this.collide = collideBottomlessTile;
  this.width = 20;
  this.height = 20;
  this.x = x;
  this.y = y;
}

function drawPlayer(){
  ctx.fillRect(this.x, this.y, this.width, this.height);
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
staticObjects[0] = new Line(200,200,100,200);


canvas.onmousemove = function(e){
  //console.log(e);
  mouseX = e.x;
  mouseY = e.y;
  if( e.which != 0 ){
    mouseD = true;
    
    var b = new Ball();
    b.x = e.x;
    b.y = e.y;
    b.ox = e.x;
    b.oy = e.y;
    dynamicObjects[dynamicObjects.length] = b;
    //*/
  } else {
    mouseD = false;
  }
}

canvas.mouseDown = function(){
  mouseD = true;
}
canvas.mouseUp = function(){
  mouseD = false;
}

var oldT = 0;
function callback(t){
  ctx.fillStyle='black';
  if(oldT == 0){ oldT=t; }
  var dt = t-oldT;
  dt = 16;
  if( wIsPressed ){
    dynamicObjects[0].oy += .1;
  }
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
