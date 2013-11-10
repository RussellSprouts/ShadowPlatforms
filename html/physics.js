var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
ctx.fillStyle='rgba(255,0,0,0.4)';
ctx.strokeStyle='green';
ctx.lineWidth = 2;
IS_SERVER = false;
var width = canvas.width;
var height = canvas.height;
var gravity = 10;
var ballCount = 0;
var ITERATION_COUNT = 100;
var player;
var CONNECTION;
var GAME_SCORE = 0;
var PLAYER_SPEED = 7;
var RADIUS = 4;
var X = 0;
var Y = 1;
var OLD_X = 2;
var OLD_Y = 3;
var JUMP_GRACE_PERIOD = 5;

var mouseX = 0;
var mouseY = 0;

aIsPressed = false;
sIsPressed = false;
wIsPressed = false;
dIsPressed = false;

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

function acceleration(){
  var x = 0;
  var y = gravity;
  if( aIsPressed ){
    x = -PLAYER_SPEED;
  } else if( dIsPressed ){
    x = PLAYER_SPEED;
  }
  
  if( wIsPressed && player.onGround > 0 ){
    y = -50*PLAYER_SPEED;
    player.onGround = 0;
  }
  return vec(x, y);
}

function integrateVerlet(b, t, dt){
  var x = b.x;
  var y = b.y;
  var tempX = b.x;
  var tempY = b.y;
  var oldX = b.ox;
  var oldY = b.oy;
  var a = acceleration();
  var ax = a[0];
  var ay = a[1];
  b.x += 0.99*x-0.99*oldX+ax*dt*dt;
  b.y += 0.99*y-0.99*oldY+ay*dt*dt;
  b.ox = tempX;
  b.oy = tempY;
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
		        doA.ox = coords[2];
		        doA.oy = coords[3];
		      }
        }
      }
    }
  }
}

dynamicObjects = [];
staticObjects = [];

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
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";
  ctx.lineTo(this.bx, this.by);
  ctx.stroke();
  ctx.strokeStyle = "gray";
  ctx.lineWidth = 1;
  ctx.lineTo(this.ax, this.ay);
  ctx.stroke();
}

var stuffToDraw = [];
function drawBoundingBox(x1,y1,x2,y2){
  stuffToDraw.push(function(){
    ctx.fillRect(x1,y1,x2-x1,y2-y1)
  });
}

function drawIntercepts(){
  stuffToDraw.push(function(){
    ctx.fillRect(20,10,30,20)
  });
}

function drawDebug(){
  for(var i=0; i<stuffToDraw.length; i++){
    stuffToDraw[i]();
  }
  stuffToDraw = [];
}

function colinear(a1,a2,b1,b2){
  var da = minus(a2,a1),
      db = minus(b2,b1);
  var ma = slope(da)
  var mb = slope(db)
  if( ma==0 && mb==0 ){
    //horizontal lines
    return equal(onlyY(a1),onlyY(b1));
  } else if( ma==mb ){
    //same slope.
    var yintA = -ma*a1[0],
        yintB = -mb*b1[0]
    if( yintA != yintB ) return false;
    return lessEqX(vecmin(a1,a2),vecmin(b1,b2)) && lessEqX(vecmin(b1,b2),vecmax(a1,a2))
        ||  lessEqX(vecmin(b1,b2),vecmin(a1,a2)) && lessEqX(vecmin(a1,a2),vecmax(b1,b2));
  } else if( (ma!=ma && mb!=mb) ){
    //vertical lines
    return equal(onlyX(a1),onlyX(b1));
  } else {
    return false;
  }
}

function intersects(a1,a2,b1,b2){
  var b = minus(a2,a1),
      d = minus(b2,b1);
  var crossBD = cross(b,d);
  if( crossBD == 0 ) return colinear(a1,a2,b1,b2);
  var c = minus(b1,a1);
  var t = cross(c,d) / crossBD;
  if( t < 0 || t > 1 ) return false;
  var u = cross(c,b) / crossBD;
  if( u < 0 || u > 1) return false;
  return true
}

var anycorner = function(f,origin,size){
    return f(origin) ||
    f(plus(origin,size)) ||
    f(plus(origin,onlyX(size))) ||
    f(plus(origin,onlyY(size)));
}

function inBounds(a,b,oP,nP,size){
  var traveled = minus(nP,oP);
  var intersectsLine = function(start){
    var end = plus(start,traveled);
    return intersects(start,end,a,b)
  }
  return anycorner(intersectsLine,oP,size);
}

var EPSILON = 1
function collideLine(dyn){
  var curr = vec(dyn.x, dyn.y),
      old = vec(dyn.ox, dyn.oy);
  var a = vec(this.ax,this.ay),
      b = vec(this.bx,this.by);
  var oTL = old, oTR = plus(old, vec(dyn.width,0)), oBL = plus(old,vec(0,dyn.height)), oBR = plus(old, vec(dyn.width,dyn.height));
  var TL = curr, TR = plus(curr, vec(dyn.width,0)), BL = plus(curr,vec(0,dyn.height)), BR = plus(curr, vec(dyn.width,dyn.height));
  var isInBounds = inBounds(a,b,old,curr,vec(dyn.width,dyn.height));
  //if( isInBounds ) drawBoundingBox(a[0],a[1],b[0],b[1]);
  if( isInBounds && 
  side(a,b,oTL) >= -EPSILON && side(a,b,oTR) >= -EPSILON && side(a,b,oBL) >= -EPSILON && side(a,b,oBR) >= -EPSILON &&
 (side(a,b,TL)  <= EPSILON || side(a,b,TR)  <= EPSILON || side(a,b,BL) <= EPSILON || side(a,b,BR) <= EPSILON )){
    var adjust, pt, oPt;
		ctx.strokeStyle='black'
    if( lessX(a,b) && greaterEqY(a,b) ){
      player.color='green';
      adjust = vec(0,.1);
      oPt = oTL;
      pt = TL;
    } else if( lessX(a,b) && lessY(a,b) ){
      player.color='yellow';
      adjust = vec(-dyn.width, .1);
      oPt = oTR;
      pt = TR;
    } else if( greaterX(a,b) && lessY(a,b) ){
      player.color='blue';
      adjust = vec(-dyn.width,-dyn.height - .1);
      dyn.onGround = wIsPressed?0:JUMP_GRACE_PERIOD;
      oPt = oBR;
      pt = BR;
    } else if( equalsX(a,b) && lessY(a,b) ){
      player.color='#00ffff';
      adjust = vec(-dyn.width, 0);
      oPt = oTR;
      pt = TR;
    } else if( greaterX(a,b) && greaterEqY(a,b) ){
      player.color='red';
      adjust = vec(0,-dyn.height  - .1);
      dyn.onGround = wIsPressed?0:JUMP_GRACE_PERIOD;
      oPt = oBL;
      pt = BL;
    } else if( equalsX(a,b) && greaterEqY(a,b) ){
      player.color='brown';
      adjust = vec(0,0);
      oPt = oTL;
      pt = TL;
    }
    var coords = calculateNew(a,b,oPt,pt)
    var newPos = plus(adjust,vec(coords[0],coords[1])),
        oldPos = plus(adjust,vec(coords[2],coords[3]))
    return [newPos[0],newPos[1],oldPos[0],oldPos[1]]
  }
}

/*
function collideLine(dyn){
  var ax = this.ax, bx = this.bx, ay = this.ay, by = this.by;
  var oldTLx = dyn.ox, oldTRx = dyn.ox+dyn.width, oldBLx = dyn.ox, oldBRx = dyn.ox+dyn.width;
  var oldTLy = dyn.oy, oldTRy = dyn.oy, oldBLy = dyn.oy+dyn.height, oldBRy = dyn.oy+dyn.height;
  var newTLx = dyn.x, newTRx = dyn.x+dyn.width, newBLx = dyn.x, newBRx = dyn.x+dyn.width;
  var newTLy = dyn.y, newTRy = dyn.y, newBLy = dyn.y+dyn.height, newBRy = dyn.y+dyn.height;
  var isInBoundingBoxX, isInBoundingBoxY;
  
  var lowerx = Math.min(ax,bx);
  var higherx = Math.max(ax,bx);
  lowerx -= 2;
  higherx +=2;
  isInBoundingBoxX = (dyn.x >= lowerx && dyn.x <= higherx) || (lowerx >= dyn.x && lowerx <= dyn.x+dyn.width) || (higherx >= dyn.x && higherx <= dyn.x+dyn.width);
  var lowery = Math.min(ay,by);
  var highery = Math.max(ay,by);
  lowery -= 2;
  higherx += 2;
  isInBoundingBoxY = (dyn.y >= lowery && dyn.y <= highery) || (lowery >= dyn.y && lowery <= dyn.y+dyn.height) || (highery >= dyn.y && highery <= dyn.y+dyn.height);
  if( isInBoundingBoxX && isInBoundingBoxY ){
    drawBoundingBox(lowerx,lowery,higherx,highery);
	  if( crossProduct(ax,ay,bx,by,oldTLx,oldTLy) >= -2 && crossProduct(ax,ay,bx,by,oldTRx,oldTRy) >= -2 &&
		  crossProduct(ax,ay,bx,by,oldBLx,oldBLy) >= -2 && crossProduct(ax,ay,bx,by,oldBRx,oldBRy) >= -2 &&
		 (crossProduct(ax,ay,bx,by,newTLx,newTLy) < 2 || crossProduct(ax,ay,bx,by,newTRx,newTRy) < 2 ||
		  crossProduct(ax,ay,bx,by,newBLx,newBLy) < 2 || crossProduct(ax,ay,bx,by,newBRx,newBRy) < 2) ){
    drawIntercepts();
		if( (ax < bx && ay > by) || (ay == by && ax < bx) ){
			ctx.fillStyle='green';
			ctx.strokeStyle='black'
			return intersection(ax,ay,bx,by,oldTLx,oldTLy,newTLx,newTLy);
		} else if( ax < bx && ay < by ){
			var coord = intersection(ax,ay,bx,by,oldTRx,oldTRy,newTRx,newTRy);
			ctx.fillStyle='yellow';
			ctx.strokeStyle='black'
			dyn.onGround = 0;
			coord[0] -= dyn.width;
			return coord;
		} else if( (ax > bx && ay < by)  ){
			var coord = intersection(ax,ay,bx,by,oldBRx,oldBRy,newBRx,newBRy);
			coord[0] -= dyn.width;
			coord[1] -= dyn.height;
			dyn.onGround = JUMP_GRACE_PERIOD;
			ctx.fillStyle='blue';
			ctx.strokeStyle='black'
			return coord;
		} else if( (ax == bx && ay < by) ){
			var coord = intersection(ax,ay,bx,by,oldBRx,oldBRy,newBRx,newBRy);
			coord[0] -= dyn.width;
			coord[1] -= dyn.height;
			ctx.fillStyle='#00ffff';
			ctx.strokeStyle='black'
			return coord;
		} else if( (ax > bx && ay >= by) ){
			var coord = intersection(ax,ay,bx,by,oldBLx,oldBLy,newBLx,newBLy);
			coord[1] -= dyn.height;
			ctx.fillStyle='red';
			ctx.strokeStyle='black'
			dyn.onGround = JUMP_GRACE_PERIOD;
			return coord;
		} else if( ax == bx && ay>= by ) {
			var coord = intersection(ax,ay,bx,by,oldBLx,oldBLy,newBLx,newBLy);
			coord[1] -= dyn.height;
			ctx.fillStyle='brown';
			ctx.strokeStyle='black'
			return coord;
		}
	  } 
  }
}
*/

function vec(x1,x2){
  return [x1,x2];
}

function dot(a,b){
  return a[0]*b[0] + a[1]*b[1];
}
function cross(a,b){
  return a[0]*b[1] - a[1]*b[0];
}
function plus(a,b){
  return [a[0]+b[0],a[1]+b[1]];
}
function minus(a,b){
  return [a[0]-b[0],a[1]-b[1]];
}
function scale(k,a){
  return [k*a[0],k*a[1]]
}
function side(a,b,p){
  return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
}
function greaterX(a,b){
  return a[0] > b[0]
}
function greaterEqX(a,b){
  return a[0] >= b[0]
}
function equalsX(a,b){
  return a[0]==b[0]
}
function lessX(a,b){
  return a[0]<b[0]
}
function lessEqX(a,b){
  return a[0]<=b[0]
}
function greaterY(a,b){
  return a[1] > b[1]
}
function greaterEqY(a,b){
  return a[1] >= b[1]
}
function equalsY(a,b){
  return a[1]==b[1]
}
function lessY(a,b){
  return a[1]<b[1]
}
function lessEqY(a,b){
  return a[1]<=b[1]
}
function onlyX(a){
  return [a[0],0]
}
function onlyY(a){
  return [0,a[1]]
}
function vecmin(a,b){
  return [Math.min(a[0],b[0]),Math.min(a[1],b[1])]
}
function vecmax(a,b){
  return [Math.max(a[0],b[0]),Math.max(a[1],b[1])]
}
function equal(a,b){
  return a[0]==b[0] && a[1]==b[1];
}
function len(a){
  return Math.sqrt(a[0]*a[0] + a[1]*a[1])
}
function len2(a){
  return a[0]*a[0] + a[1]*a[1]
}
function unit(a){
  var l = len(a)
  if( l == 0 ) return vec(0,0)
  return scale(1/l,a)
} 
function slope(a){
  return a[1]/a[0];
}


function crossProduct(ax, ay, bx, by, px, py){
  return ((bx - ax)*(py - ay)-(by-ay)*(px-ax));
}

function crossProduct2D(x1,y1,x2,y2){
  return x1*y2 - y1*x2;
}
function project(a,b){
  var len2b = len2(b)
  if(len2b == 0){
    return vec(0,0)
  }
  return scale(dot(a,b)/len2b,b)
}

function shorten(l,a){
  if( !aIsPressed && !dIsPressed ){
  var l2 = l*l;
  var lena2 = len2(a);
  if(lena2 < l2) return vec(0,0);
  return scale((lena2-l2)/lena2,a)
  }
  return a;
}

function randomPosition(){
  return vec(Math.random()*580+20, Math.random()*300+20)
}

var SURFACE_FRICTION = .08;
function calculateNew(a,b,oP,nP){
  var newOnAB = plus(a,project(minus(nP,a),minus(b,a)));
  var oldOnAB = plus(newOnAB,shorten((SURFACE_FRICTION),minus(oP,newOnAB)))
  return [newOnAB[0],newOnAB[1],oldOnAB[0],oldOnAB[1]];
}
/*

function vectorProjection(bx,by,px,py){
  var magAB = (bx)*(bx) + (by)*(by);
  if (magAB == 0) {
    return [0,0];
  }
  return [((px*(bx*bx)) / magAB) + ((py*(by*bx)) / magAB),
          ((py*(bx*by)) / magAB) + ((py*(by*by)) / magAB)];
}

function intersection(ax, ay, bx, by, poldx, poldy, pnewx, pnewy){
  var newCoords = vectorProjection(bx-ax,by-ay,pnewx-ax,pnewy-ay);
  var oldCoords = vectorProjection(bx-ax,by-ay,poldx-ax,poldy-ay);
  console.log(newCoords, oldCoords);
  return [ax + newCoords[0] * SURFACE_FRICTION, ay + newCoords[1] * SURFACE_FRICTION, ax + oldCoords[0] * SURFACE_FRICTION, ay + oldCoords[1] * SURFACE_FRICTION];
}

*/


function drawPlayer(){
  var temp = ctx.fillStyle
  ctx.fillStyle = this.color;
  ctx.fillRect(this.x, this.y, this.width, this.height);
  ctx.fillStyle = temp;
  //ctx.strokeRect(this.ox, this.oy, this.width, this.height);
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

function Goal(){
  this.pos = randomPosition();
  this.draw = drawGoal;
  this.collide = collideGoal;
}

function collideGoal(p){
  var p1 = vec(p.x,p.y)
  var p2 = vec(p.x+p.width,p.y+p.height)
  var this1 = this.pos
  var thisS = vec(this.pos[0]+20,this.pos[1]+20);
  if( (this1[0] < p2[0] == thisS[0] > p1[0]) &&
      (this1[1] < p2[1] == thisS[1] > p1[1])){
    this.pos = randomPosition();
    $('.score').html(++GAME_SCORE);
  }
}

function drawGoal(){
  ctx.fillStyle = 'gold';
  ctx.fillRect(this.pos[0]-10,this.pos[1]-10,20,20)
}

dynamicObjects[0] = new Player();
player = dynamicObjects[0];


staticObjects[0] = new Line(10,10,600,10);
staticObjects[1] = new Line(600,600,10,600);
staticObjects[2] = new Line(600,10,600,600);
staticObjects[3] = new Line(10,600,10,10);
staticObjects[4] = new Goal();
function getPosition(e) {

    //this section is from http://www.quirksmode.org/js/events_properties.html
    var targ;
    if (!e)
        e = window.event;
    if (e.target)
        targ = e.target;
    else if (e.srcElement)
        targ = e.srcElement;
    if (targ.nodeType == 3) // defeat Safari bug
        targ = targ.parentNode;

    // jQuery normalizes the pageX and pageY
    // pageX,Y are the mouse positions relative to the document
    // offset() returns the position of the element relative to the document
    var x = e.pageX - $(targ).offset().left;
    var y = e.pageY - $(targ).offset().top;

    return {"x": x, "y": y};
};

var NUMBER_OF_PLATFORMS = 8;
var NUMBER_OF_WALLS = 5;
var STATIC_OBJECTS_COUNTER = 0;
function pushStatic(obj){
  if( staticObjects.length < NUMBER_OF_PLATFORMS + NUMBER_OF_WALLS ){
    staticObjects.push(obj);
  } else {
    staticObjects[NUMBER_OF_WALLS+(STATIC_OBJECTS_COUNTER%NUMBER_OF_PLATFORMS)] = obj;
    STATIC_OBJECTS_COUNTER++;
  }
}

// now just make sure you use this with jQuery
// obviously you can use other events other than click
$(canvas).click(function(event) {
    // jQuery would normalize the event
    var position = getPosition(event);
    //now you can use the x and y positions
    if( IS_SERVER ){

    } else {
      send("handleClick("+JSON.stringify(position)+");")
      handleClick(position);
    }
});

function handleClick(position){
    pushStatic(new Line(position.x+20,position.y-20,position.x-20,position.y-20))
    pushStatic(new Line(position.x-20,position.y+20,position.x+20,position.y+20))
    pushStatic(new Line(position.x-20,position.y-20,position.x-20,position.y+20))
    pushStatic(new Line(position.x+20,position.y+20,position.x+20,position.y-20))
}

var lastMouseX = 0, lastMouseY = 0;
canvas.mouseUp = function(e){
  mouseD = false;
}

var oldT = 0;
function callback(t){
  var dt = 16;
  if( wIsPressed ){
    //dynamicObjects[0].oy += .1;
  }
  player.onGround--;
  for( var i = 0; i<dynamicObjects.length; i++ ){
    integrateVerlet(dynamicObjects[i], t, dt/100);
    
  }
  satisfyConstraints(dynamicObjects, t);
  ctx.clearRect(0,0,width,height);
  for( var i = 0; i<dynamicObjects.length; i++ ){
    dynamicObjects[i].draw();
  }
  for( var i = 0; i<staticObjects.length; i++ ){
    staticObjects[i].draw();
  }
  drawDebug();
  oldT = t;
  window.requestAnimationFrame(callback);
  if( CONNECTION && IS_SERVER ){
    if( Math.random()<.2 ){
      send(packData());
    } else {
      send(";aIsPressed="+aIsPressed +
            ";dIsPressed="+dIsPressed +
            ";aIsPressed="+aIsPressed +
            ";wIsPressed="+wIsPressed)
    }
  }
}

function packData(){
  var str = ";aIsPressed="+aIsPressed +
            ";dIsPressed="+dIsPressed +
            ";aIsPressed="+aIsPressed +
            ";wIsPressed="+wIsPressed +
            ";$('.score').html("+GAME_SCORE +");"+
            ";player.x = "+player.x +
            ";player.y = "+player.y +
            ";player.ox = "+player.ox +
            ";player.oy = "+player.oy +
            ";player.onGround = "+player.onGround +
            ";player.color = '"+player.color + "';";
  for( var i = 0; i<staticObjects.length; i++){
    var obj = staticObjects[i]
    if( staticObjects[i] instanceof Line ){
      str += ';staticObjects['+i+'].ax='+obj.ax;
      str += ';staticObjects['+i+'].ay='+obj.ay;
      str += ';staticObjects['+i+'].bx='+obj.bx;
      str += ';staticObjects['+i+'].by='+obj.by+';';
    } else if( staticObjects[i] instanceof Goal){
      str += ';staticObjects['+i+'].pos[0]=' + obj.pos[0];
      str += ';staticObjects['+i+'].pos[1]=' + obj.pos[1];
    }
  }
  return 'eval(("'+str.replace('staticObjects','QW')+'").replace("QW","staticObjects"))';
}

function send(data){
  CONNECTION.send(data);
}

function unpackData(str){
  eval(str); //eval is evil.
}

function handleData(c, data){
  unpackData(data);
  CONNECTION = c;
}

window.requestAnimationFrame(callback);
