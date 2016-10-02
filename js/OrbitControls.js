/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 *
 * customized for momentum (zoom and phi/delta) by paulkaplan
 * customized for touch events by Aslogd
 */

THREE.OrbitControls = function ( object, domElement ) {

  this.object = object;
  this.domElement = ( domElement !== undefined ) ? domElement : document;

  // API

  this.enabled = true;

  this.center = new THREE.Vector3();

  this.userZoom = true;
  this.userZoomSpeed = 1.0;

  this.userRotate = true;
  this.userRotateSpeed = 1.0;

  this.userPan = true;
  this.userPanSpeed = 0.01;
  this.panXZOnly = false;

  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

  this.minPolarAngle = 0; // radians
  this.maxPolarAngle = Math.PI; // radians

  this.minDistance = 0;
  this.maxDistance = Infinity;

  this.zoomDampingFactor = 0.2;

  this.momentumDampingFactor = 0.9; //0.8
  this.momentumScalingFactor = 0.005;

  this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };


  // internals

  var scope = this;

  var EPS = 0.000001;
  var PIXELS_PER_ROUND = 1800;

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var zoomStart = new THREE.Vector2();
  var zoomEnd = new THREE.Vector2();
  var zoomDelta = new THREE.Vector2();

  var _zoomEnd = 0;
  var _zoomStart = 0;

  var phiDelta = 0;
  var thetaDelta = 0;
  var scale = 1;

  var lastPosition = new THREE.Vector3();

  var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
  var state = STATE.NONE;

  var TOUCHSTATE = {NONE: 0, ROTATE: 1, ZOOM: 2, PAN: 3};
  var touchState = TOUCHSTATE.NONE;
  var touchStateDirty = false;
  var simulationState = 0;
  var onGoingTouches = [];

  var targetRotation = 0;
  var targetRotationOnMouseDown = 0;
  var mouseX = 0;
  var mouseXOnMouseDown = 0;

  var windowHalfX = window.innerWidth / 2;
  var windowHalfY = window.innerHeight / 2;
  var pre = {pageX:0, pageY:0};
  var lastDistance = 0;
  // events

  var changeEvent = { type: 'change' };


  this.rotateLeft = function ( angle ) {

    if ( angle === undefined ) {

      angle = getAutoRotationAngle();

    }

    thetaDelta -= angle;

  };

  this.rotateRight = function ( angle ) {

    if ( angle === undefined ) {

      angle = getAutoRotationAngle();

    }

    thetaDelta += angle;

  };

  this.rotateUp = function ( angle ) {

    if ( angle === undefined ) {

      angle = getAutoRotationAngle();

    }

    phiDelta -= angle;

  };

  this.rotateDown = function ( angle ) {

    if ( angle === undefined ) {

      angle = getAutoRotationAngle();

    }

    phiDelta += angle;

  };
  
  this.zoomCamera = function(){
    var _this = this;

    var factor = 1.0 + ( _zoomEnd - _zoomStart ) * this.userZoomSpeed;
    scale *= factor;
    

    _zoomStart += ( _zoomEnd - _zoomStart ) * this.zoomDampingFactor;


  };


  this.pan = function ( distance ) {

    var sameObj = this.object.position.y,
    sameCen = this.center.y;
    distance.transformDirection( this.object.matrix );
    distance.multiplyScalar( scope.userPanSpeed * this.center.distanceTo(this.object.position) );
    this.object.position.add( distance );
    this.center.add( distance );


    if(scope.panXZOnly){
      this.object.position.y = sameObj;
      this.center.y = sameCen;
    }

  };
  
  this.momentum = function(){
    if(!momentumOn) return;

    // console.log('momentum-ing: '+momentumUp+" "+momentumLeft);

    if(Math.abs(momentumUp + momentumLeft) < 10e-5){ momentumOn = false; return; }

    momentumUp   *= this.momentumDampingFactor;
    momentumLeft *= this.momentumDampingFactor;

    thetaDelta -= this.momentumScalingFactor * momentumLeft;
    phiDelta   -= this.momentumScalingFactor * momentumUp;

  };

  this.update = function () {
    this.zoomCamera();
    this.momentum();
    // console.log(scale)

    var position = this.object.position;
    var offset = position.clone().sub( this.center );

    // angle from z-axis around y-axis

    var theta = Math.atan2( offset.x, offset.z );

    // angle from y-axis

    var phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

    if ( this.autoRotate ) {

      this.rotateLeft( getAutoRotationAngle() );

    }

    theta += thetaDelta;
    phi += phiDelta;

    // restrict phi to be between desired limits
    phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

    // restrict phi to be betwee EPS and PI-EPS
    phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

    var radius = offset.length() * scale;

    // restrict radius to be between desired limits
    radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

    offset.x = radius * Math.sin( phi ) * Math.sin( theta );
    offset.y = radius * Math.cos( phi );
    offset.z = radius * Math.sin( phi ) * Math.cos( theta );

    position.copy( this.center ).add( offset );

    this.object.lookAt( this.center );

    thetaDelta = 0;
    phiDelta = 0;
    scale = 1;

    if ( lastPosition.distanceTo( this.object.position ) > 0 ) {

      this.dispatchEvent( changeEvent );

      lastPosition.copy( this.object.position );

    }

  };


  function getAutoRotationAngle() {

    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

  }

  function getZoomScale() {

    return Math.pow( 0.95, scope.userZoomSpeed );

  }

  function onMouseDown( event ) {
    
    momentumOn = false;

    momentumLeft = momentumUp = 0;

    if ( scope.enabled === false ) return;
    if ( scope.userRotate === false ) return;

    event.preventDefault();

    if ( event.button === 0 ) {

      state = STATE.ROTATE;

      rotateStart.set( event.clientX, event.clientY );

    } else if ( event.button === 1 ) {

      state = STATE.ZOOM;

      zoomStart.set( event.clientX, event.clientY );

    } else if ( event.button === 2 ) {
      if(scope.userPan)
        state = STATE.PAN;

    }

    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'mouseup', onMouseUp, false );


  }

  var momentumLeft, momentumUp;

  function onMouseMove( event ) {

    if ( scope.enabled === false ) return;

   // event.preventDefault();
    

    if ( state === STATE.ROTATE ) {

      rotateEnd.set( event.clientX, event.clientY );
      rotateDelta.subVectors( rotateEnd, rotateStart );

      momentumLeft = event.movementX;
      momentumUp   = event.movementY;
      // momentumLeft += 2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed;
      // momentumUp   += 2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed;
      scope.rotateLeft( 2 * Math.PI * rotateDelta.x / PIXELS_PER_ROUND * scope.userRotateSpeed );
      scope.rotateUp( 2 * Math.PI * rotateDelta.y / PIXELS_PER_ROUND * scope.userRotateSpeed );

      rotateStart.copy( rotateEnd );
    


    } else if ( state === STATE.ZOOM ) {

      zoomEnd.set( event.clientX, event.clientY );
      zoomDelta.subVectors( zoomEnd, zoomStart );

      if ( zoomDelta.y > 0 ) {

        scope.zoomIn();

      } else {

        scope.zoomOut();

      }

      zoomStart.copy( zoomEnd );

    } else if ( state === STATE.PAN ) {

      var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

      scope.pan( new THREE.Vector3( - movementX, movementY, 0 ) );

    }

  }
  
  var momentumOn = false;

  function onMouseUp( event ) {

    momentumOn = true;

    if ( scope.enabled === false ) return;
    if ( scope.userRotate === false ) return;

    document.removeEventListener( 'mousemove', onMouseMove, false );
    document.removeEventListener( 'mouseup', onMouseUp, false );

    state = STATE.NONE;

  }

  function onMouseWheel( event ) {

    if ( scope.enabled === false ) return;
    if ( scope.userZoom === false ) return;
    event.preventDefault();
    event.stopPropagation();

    var delta = 0;

    if ( event.wheelDelta ) { // WebKit / Opera / Explorer 9

      delta = event.wheelDelta / 40;

    } else if ( event.detail ) { // Firefox

      delta = - event.detail / 3;

    }

    _zoomStart += delta * 0.001;

  }

  function onKeyDown( event ) {

    if ( scope.enabled === false ) return;
    if ( scope.userPan === false ) return;

    switch ( event.keyCode ) {

      case scope.keys.UP:
        scope.pan( new THREE.Vector3( 0, 1, 0 ) );
        break;
      case scope.keys.BOTTOM:
        scope.pan( new THREE.Vector3( 0, - 1, 0 ) );
        break;
      case scope.keys.LEFT:
        scope.pan( new THREE.Vector3( - 1, 0, 0 ) );
        break;
      case scope.keys.RIGHT:
        scope.pan( new THREE.Vector3( 1, 0, 0 ) );
        break;
    }

  }

  function updateTouchState(){
    if(onGoingTouches.length < 3)
    {
      touchState = onGoingTouches.length;
    }
    else
    {
      touchState = TOUCHSTATE.PAN;
    }
  }


  function onTouchEnd(event){

    onGoingTouches.pop();
    lastDistance = 0;
    pre = {pageX:0, pageY:0};

    updateTouchState();
    onMouseUp(null);


  }

  function onTouchStart( event ) {
    var touches = event.changedTouches;
    for(var i = 0; i < touches.length; i++)
    {
      onGoingTouches.push(touches[i]);
    }

    updateTouchState();

    //event.preventDefault();

    mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
    var pseudoE = {clientX: event.touches[0].pageX, clientY: event.touches[0].pageY, button: touchState-1, preventDefault: function(){}};
    onMouseDown(pseudoE);
  }

  function onTouchMove( event ) {
    var pseudoE ;
    if(touchState != TOUCHSTATE.ZOOM)
    {
      mouseX = event.touches[ 0 ].pageX - windowHalfX;
      pseudoE = {clientX: event.touches[0].pageX, clientY: event.touches[0].pageY, 
        movementX: event.touches[0].pageX - pre.pageX,  movementY: event.touches[0].pageY - pre.pageY,
        preventDefault: event.preventDefault};
      onMouseMove(pseudoE);

      
      pre.pageX = event.touches[0].pageX;
      pre.pageY = event.touches[0].pageY;
    }
    else
    {
       var touchA = new THREE.Vector2(event.touches[0].pageX, event.touches[0].pageY);
       var touchB = new THREE.Vector2(event.touches[1].pageX, event.touches[1].pageY);
       var distance = touchA.distanceTo(touchB);
       
       var dir = (distance - (lastDistance ? lastDistance : distance)) * 10;
       pseudoE = {wheelDelta: dir, preventDefault: function(){}, stopPropagation: function(){}};
       onMouseWheel(pseudoE);

       lastDistance = distance;
  }
 // event.preventDefault();

}
  this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
  this.domElement.addEventListener( 'mousedown', onMouseDown, false );
  this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
  this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
  this.domElement.addEventListener( 'keydown', onKeyDown, false);

  this.domElement.addEventListener('touchstart', onTouchStart, false);
  this.domElement.addEventListener('touchmove', onTouchMove, false);
  this.domElement.addEventListener('touchend', onTouchEnd, false);
};
THREE.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );