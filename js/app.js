document.addEventListener("DOMContentLoaded", function(){

    var scene, camera, renderer, controls;
    var geometry, material, mesh;
    var clock = new THREE.Clock();

    var raycaster;
    var mouse;
    var currentRoute;
    var loadedGeometries = {};
    var animated = {};

    var presets = {
        showers: "?map=%7B%22camCoords%22:%7B%22x%22:1.46,%22y%22:0.24,%22z%22:-1.5%7D,%22camCenter%22:%7B%22x%22:0.28,%22y%22:-2.5,%22z%22:3.75%7D%7D#/UPC",
        checkin: "?map=%7B%22camCoords%22:%7B%22x%22:-0.26,%22y%22:0.49,%22z%22:-0.01%7D,%22camCenter%22:%7B%22x%22:1.47,%22y%22:-2.45,%22z%22:3.29%7D%7D#/UPC",
        vertex: "?map=%7B%22camCoords%22:%7B%22x%22:-2.21,%22y%22:1.74,%22z%22:0.97%7D,%22camCenter%22:%7B%22x%22:-2.21,%22y%22:-2.34,%22z%22:4.38%7D%7D#/UPC",
        talks: "?map=%7B%22camCoords%22:%7B%22x%22:0.02,%22y%22:4.13,%22z%22:-1.87%7D,%22camCenter%22:%7B%22x%22:0,%22y%22:0,%22z%22:0%7D%7D#/A5/0",
        game: "?map=%7B%22camCoords%22:%7B%22x%22:1.04,%22y%22:4.71,%22z%22:-0.16%7D,%22camCenter%22:%7B%22x%22:1.04,%22y%22:0.74,%22z%22:1.63%7D%7D#/A5/2",
        meal: "?map=%7B%22camCoords%22:%7B%22x%22:-0.07,%22y%22:0.52,%22z%22:0.3%7D,%22camCenter%22:%7B%22x%22:0.28,%22y%22:-2.45,%22z%22:3.78%7D%7D#/UPC",
        chill: "?map=%7B%22camCoords%22:%7B%22x%22:0,%22y%22:4.08,%22z%22:-1.68%7D,%22camCenter%22:%7B%22x%22:0,%22y%22:0,%22z%22:0%7D%7D#/A6/0",
        coffee: "?map=%7B%22camCoords%22:%7B%22x%22:-0.04,%22y%22:1.12,%22z%22:-1.2%7D,%22camCenter%22:%7B%22x%22:-0.03,%22y%22:-0.33,%22z%22:-0.39%7D%7D#/A6/0",
        biene: "?map=%7B%22camCoords%22:%7B%22x%22:3.45,%22y%22:0.61,%22z%22:1.05%7D,%22camCenter%22:%7B%22x%22:-0.1,%22y%22:-1.01,%22z%22:3.11%7D%7D#/UPC",
        demos: "?map=%7B%22camCoords%22:%7B%22x%22:0.02,%22y%22:5.66,%22z%22:-1.95%7D,%22camCenter%22:%7B%22x%22:0,%22y%22:0,%22z%22:0%7D%7D#/A5/2"
    };

    var clickEvents= {};
    var hoverEvents= {};
    var hoverOutEvents= {};
    var helpOpen = false;
    var optsOpen = false;
    var addingMarker = false;
    var lastHover = "";
    var mouseDownTimestamp;

    var CLICK_MAX_TIME = 200;
    var ASSETS_URL = "assets/";
    var HASH_PREFIX = "/";
    var DEFAULT_ROUTE = "UPC";
    var HIDE_TIME = 200;
    var MARKER_SCALE = 0.05;
    var TAG_SCALE = 0.05;


    var assets = [
        {
            name: "marker",
            path: "marker.json"
        },
        {
            name: "bee",
            path: "bee.json"
        }
    ];

    var map = {};
    var routes = {
        UPC:
        {
            path: "main.json",
            name: "UPC",
            root: true,
            scene: null
        },
        A4:
        {
            name: "A4",
            panel: "map-floors",
            children:
            [
                {
                    name:"0",
                    path: "A40.json",
                    offset: 0,
                    scene:null
                },
                {
                    name:"E",
                    path: "A4E.json",
                    offset: 1,
                    scene:null
                },
                {
                    name:"1",
                    path: "A41.json",
                    offset: 2,
                    scene:null
                },
                {
                    name:"2",
                    path: "A42.json",
                    offset: 3,
                    scene:null
                }
            ]
        },
        A5:
        {
            name: "A5",
            panel: "map-floors",
            children:
            [
                {
                    name:"0",
                    path: "A50.json",
                    offset: 0,
                    scene:null
                },
                {
                    name:"E",
                    path: "A5E.json",
                    offset: 1,
                    scene:null
                },
                {
                    name:"1",
                    path: "A51.json",
                    offset: 2,
                    scene:null
                },
                {
                    name:"2",
                    path: "A52.json",
                    offset: 3,
                    scene:null
                }
            ]
        },
        A6:
        {
            name: "A6",
            panel: "map-floors",
            children:
            [
                {
                    name:"0",
                    path: "A60.json",
                    offset: 0,
                    scene:null
                },
                {
                    name:"E",
                    path: "A6E.json",
                    offset: 1,
                    scene:null
                },
                {
                    name:"1",
                    path: "A61.json",
                    offset: 2,
                    scene:null
                },
                {
                    name:"2",
                    path: "A62.json",
                    offset: 3,
                    scene:null
                }
            ]
        },
        cube:
        {
            path: "cube.json",
            name: "cube",
            scene: null
        }
    };



    function init() {


        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 100 );
        camera.position.z = -4;
        camera.position.y = 4;
        camera.position.x = 0;

        //Renderer
        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setClearColor(0xffffff);
        //rgb values in blender are not gamma corrected
        renderer.gammaOutput = true;
        renderer.gammaInput = true;

        controls = new THREE.OrbitControls(camera, renderer.domElement)

        map = loadFromStorage("map");
        initParams();

        document.body.appendChild( renderer.domElement );

        loadAssets(function(){
            initEvents();

            //Force Load Scene
            onHashChange();
        });

    }

    function initParams(){
        var params = getQueryParams(location.search);
        if(params.map)
        {
            var linkedMap = JSON.parse(params.map);
            if(linkedMap.camCoords)
            {
                camera.position.set(linkedMap.camCoords.x, linkedMap.camCoords.y, linkedMap.camCoords.z);
                controls.center.set(linkedMap.camCenter.x, linkedMap.camCenter.y, linkedMap.camCenter.z);
                //TODO
                //controls.center.set();
            }

            if(linkedMap.markers)
            {
                if(!map.markers)
                {
                    map.markers = map.markers || {};
                    map.markers = linkedMap.markers;
                }
                else
                {
                    for(var building in linkedMap.markers ){
                        if ( linkedMap.markers.hasOwnProperty(building) ) {
                            if(map.markers && map.markers[building])
                            {
                                linkedMap.markers[building].forEach(function(elem){
                                    map.markers[building].push(elem);
                                });
                            }
                        }
                    }
                }
            }
            

        }
    }

    function loadAssets(cb){
        var loader = new THREE.JSONLoader();
        assets.forEach(function(asset){
            loader.load( ASSETS_URL + asset.path, function( geometry, materials) {
                loadedGeometries[asset.name] = {
                    geometry: geometry,
                    materials:materials
                };
            });
        });

        cb();
    }

    function initEvents(){
        window.addEventListener( 'resize', onWindowResize, false );
        //Missclick prevention
        document.querySelector("canvas").addEventListener("mousedown",function(){
            mouseDownTimestamp = Date.now();
        });
        document.querySelector("canvas").addEventListener("mousemove",onMouseMove);
        document.querySelector("canvas").addEventListener("click",onMouseClick);
        window.addEventListener("hashchange",onHashChange);
        document.getElementById("map-helpbtn").addEventListener("click", function(){
            var htmlString = "<ul><li>Click green building: +info</li>"+
                "<li>Drag click: Rotate</li>"+
                "<li>Mouse wheel: Zoom</li>"+
                "<li>Right click: Pan</li></ul>";

            showInfo(htmlString);
        });
        document.getElementById("map-helpbtn").addEventListener("touchstart", function(e){
            e.preventDefault();
            var htmlString = "<ul><li>Tap green building: +info</li>"+
                "<li>Drag: Rotate</li>"+
                "<li>Pinch: Zoom</li>"+
                "<li>Drag 3 fingers: Pan</li></ul>";
                
            showInfo(htmlString);
        });
        document.getElementById("map-info").addEventListener("click", hideInfo);
        document.getElementById("map-opts").addEventListener("click", toggleOpts);
        document.getElementById("map-out").addEventListener("click", function(){
            goTo(routes.UPC.name);
        });

        //OPTS
        document.getElementById("map-share").addEventListener("click", function(){
            displayElement("map-shareMenu");
        });
        document.getElementById("map-copyLink").addEventListener("click", function(){
            undisplayElement("map-shareMenu");
            var includeCam = document.getElementById("map-includeCameraPos").checked;
            var includeMarkers = document.getElementById("map-includeMarkers").checked;
            var link = genLink(includeCam, includeMarkers);
            var inp = document.createElement("textarea");
            inp.innerHTML = link;
            document.body.appendChild(inp);
            inp.select();

            try {
                document.execCommand('copy');
                inp.blur();
                inp.parentNode.removeChild(inp);
            }
            catch (err) {
                prompt("Sorry, couldn't access the clipboard. Here's your link", link);
            }
        });
        document.getElementById("map-reset").addEventListener("click", reset);
        document.getElementById("map-save").addEventListener("click", save);
        document.getElementById("map-addMarker").addEventListener("click", function(){
            addingMarker = true;
            toggleOpts();
            displayElement("map-markerInfo");
        });

        document.getElementById("map-markerCancel").addEventListener("click", function(){
            addingMarker = false;
            undisplayElement("map-markerMenu");
        });

        document.getElementById("map-markerCreate").addEventListener("click", function(){
            addingMarker = false;
            undisplayElement("map-markerMenu");

            //Remove #. cuz cant be URI encoded
            var color = document.getElementById("map-markerColor").value.slice(1);
            var tag = document.getElementById("map-markerTag").value;
            createMarker(color, tag, selected.point, camera.position);
            saveMarker(currentRoute, color, tag, selected.point, camera.position);

        });

        clickEvents["A4"] = function(){
            goTo(routes.A4.name+'/0');
        };

        clickEvents["A5"] = function(){
            goTo(routes.A5.name+'/0');
        };

        clickEvents["A6"] = function(){
            goTo(routes.A6.name+'/0');
        };

        clickEvents["MealZone"] = function(){
            showInfo("The food will be served here");
        };
/*
        clickEvents["Vertex"] = function(){
            showInfo("This building will hold the open and end ceremonies");
        };
*/
        clickEvents["SportsCenter"] = function(){
            showInfo("This building will hold the open and end ceremonies. Use the spiral ramp to enter.");
        };
        clickEvents["Ramp"] = function(){
            showInfo("Use this ramp to get to the stage.");
        };
        clickEvents["Showers"] = function(){
            showInfo("You can take a shower inside the sports center");
        };

        clickEvents["Checkin"] = function(){
            showInfo("Cross the door to get your wristband and swag. Welcome to HackUPC!");
        };

        clickEvents["GameRoom"] = function(){
            showInfo("You just lost the game");
        };

        clickEvents["ToA51"] = function(){
            goTo(routes.A5.name+'/2');
        };
        clickEvents["ToA41"] = function(){
            goTo(routes.A4.name+'/2');
        };
        clickEvents["ToA42"] = function(){
            goTo(routes.A4.name+'/3');
        };
        clickEvents["ToA52"] = function(){
            goTo(routes.A5.name+'/3');
        };

        clickEvents["ToA61"] = function(){
            goTo(routes.A6.name+'/2');
        };

        clickEvents["ToA62"] = function(){
            goTo(routes.A6.name+'/3');
        };

        clickEvents["googlemap"] = function(){
            location.href="https://goo.gl/maps/izqD1uYR3J32";
        };

        initHoverOnClickable();

        var elems = document.querySelectorAll("[data-change-floor]");
        for(var i = 0; i < elems.length; i++)
        {
            (function(elem){
                elem.addEventListener("click", function(){
                    changeFloor(elem.dataset.changeFloor);
                });
            })(elems[i]);
        }

    }

    function cursor(type){
        document.querySelector("canvas").classList.remove("map-cursor-pointer");
        document.querySelector("canvas").classList.remove("map-cursor-normal");
        document.querySelector("canvas").classList.add("map-cursor-"+type);
    }

    function cursorPointer(){
        cursor("pointer");
    }

    function cursorNormal(){
        cursor("normal");   
    }

    function initHoverOnClickable(){
        for(var elem in clickEvents)
        {
            if(clickEvents.hasOwnProperty(elem))
            {
                hoverEvents[elem]= cursorPointer;
                hoverOutEvents[elem]= cursorNormal;
            }
        }
    }

    function toFixedNumber(x, decimals){
        var aux = Math.pow(10, decimals);
        return parseInt(aux*x)/aux;

    }


    function genLink(cam, mark){
        var share = {};
        if(cam)
        {
            share.camCoords = {
                x: toFixedNumber(camera.position.x,2),
                y: toFixedNumber(camera.position.y,2),
                z: toFixedNumber(camera.position.z,2)
            };

            share.camCenter = {
                x: toFixedNumber(controls.center.x,2),
                y: toFixedNumber(controls.center.y,2),
                z: toFixedNumber(controls.center.z,2)
            };
        }

        if(mark && map && map.markers)
        {
            share.markers = map.markers;
        }

        return location.origin + "/?map=" + window.encodeURI( JSON.stringify(share) ) + location.hash;

    }

    function reset(){
        location.search = "";
        localStorage["map"] = "";
        location.reload();
    }

    function save(){
        saveOnStorage("map", map);
    }

    function saveMarker(route, color, tag, position, lookAtPoint){
        var  building = route.split("/")[0];
        var  floor = route.split("/")[1];
        var obj = {
            floor: floor,
            color: color,
            position: {
                x: toFixedNumber(position.x,2),
                y: toFixedNumber(position.y,2),
                z: toFixedNumber(position.z,2)
            },
            tag: tag,
            lookAtPoint:{
                x: toFixedNumber(lookAtPoint.x,2),
                y: toFixedNumber(lookAtPoint.y,2),
                z: toFixedNumber(lookAtPoint.z,2)
            },
        };

        map.markers = map.markers || {};
        map.markers[building] = map.markers[building] || [];
        map.markers[building].push(obj);

        var auxmap = loadFromStorage("map");
        auxmap.markers = auxmap.markers || {};
        auxmap.markers[building] = auxmap.markers[building] || [];
        auxmap.markers[building].push(obj);

        saveOnStorage("map", auxmap);
    }

    function getQueryParams(qs) {
        qs = qs.split('+').join(' ');

        var params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;

        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }

        return params;
    }

    function loadFromStorage(key){
        if(localStorage[key])
            return JSON.parse(localStorage[key]);
        else
            return {};
    }

    function saveOnStorage(key, value){
        localStorage[key] = JSON.stringify(value);
    }

    function toggleOpts(){
        if(optsOpen)
        {
            optsOpen = false;
            undisplayElement("map-opts-list");
        }
        else
        {
            optsOpen = true;
            displayElement("map-opts-list");
        }
    }

    function showInfo(htmlString){
        document.getElementById("map-info-body").innerHTML = htmlString;
        displayElement("map-info");
    }

    function hideInfo(){
        undisplayElement("map-info");   
    }

    function toggleHelp(mode){
        if(mode == "click")
            displayElement("map-help-click");
        else if(mode == "touch")
            displayElement("map-help-touch");
        else
        {
            undisplayElement("map-help-click");
            undisplayElement("map-help-touch");
        }
    }

    function displayElement(id){
        var elem = document.getElementById(id);
        elem.classList.remove("notdisplayed");
        setTimeout(function(){
            show(elem);
            
        }, 1);
    }

    function undisplayElement(id){
        var elem = document.getElementById(id);
        hide(elem, function(){
            elem.classList.add("notdisplayed");
            
        });
        
    }

    function changeFloor(newfloor){
        var currentBuilding = currentRoute.split("/")[0];
        window.location.hash = "#"+HASH_PREFIX+currentBuilding+"/"+newfloor;
    }

    function goTo(route){
        window.location.hash = "#"+HASH_PREFIX+route;
    }

    function initLights(){
        hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 50, 0 );
        scene.add( hemiLight );

        //

        dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1.75, 1 );
        dirLight.position.multiplyScalar( 30 );
        scene.add( dirLight );

/*
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        var d = 50;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;

        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.0001;
*/
    }

    function initMain(){
        var img = new THREE.MeshBasicMaterial({ 
            map:THREE.ImageUtils.loadTexture('googlemap.png')
        });
        img.map.needsUpdate = true; 
        var scale = 0.013;
        var plane = new THREE.Mesh(new THREE.PlaneGeometry(1265*scale, 845*scale),img);
        plane.rotation.set(degToRad(-90), 0, degToRad(135));
        plane.position.set(0.7,-0.3,-0.3);
        plane.name = "googlemap";

        scene.add(plane);

        var material = new THREE.MultiMaterial( loadedGeometries["bee"].materials );
        var object = new THREE.Mesh( loadedGeometries["bee"].geometry, material );
        scene.add( object );
        object.rotation.set(degToRad(-90),0,0);
        //object.position.set(3,0.5,1.15);
        object.position.set(3,1,1.15);
        object.scale.set(0.01,0.01,0.01);
        animated.bee = object;


    }
    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    function onMouseMove( event ) {

        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        mouseHover();

    }

    function mouseHover(){
        // update the picking ray with the camera and mouse position    
        raycaster.setFromCamera( mouse, camera );   

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects( scene.children, true);
        selected = intersects[0] || null; 

        if(selected)
        {
            if(lastHover != selected.object.name)
            {
                if(hoverOutEvents[lastHover])
                {
                    hoverOutEvents[lastHover]();   
                }

                if(hoverEvents[selected.object.name])
                {
                    hoverEvents[selected.object.name]();
                    lastHover = selected.object.name;
                }
                else
                {
                    lastHover = "";
                }
                
            }
        }
        else
        {
            if(hoverOutEvents[lastHover])
            {
                hoverOutEvents[lastHover]();   
                lastHover = "";
            }
        }
    }


    function onMouseClick(e){

        if(mouseDownTimestamp && (Date.now() - mouseDownTimestamp) > CLICK_MAX_TIME) return;
        // update the picking ray with the camera and mouse position    
        raycaster.setFromCamera( mouse, camera );   

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects( scene.children, true);
        selected = intersects[0] || null;        
        if(addingMarker)
        {
            if ( selected ) {
                undisplayElement("map-markerInfo");
                displayElement("map-markerMenu");
            }
        }

        if(selected)
        {
            if(clickEvents[selected.object.name])
            {
                clickEvents[selected.object.name]();   
            }
        }
    }

    function onHashChange(){
        displayElement("map-loading");
        hide(renderer.domElement, function(){
            if(window.location.hash && window.location.hash.indexOf(HASH_PREFIX) != -1)
            {
                var route = window.location.hash.slice(window.location.hash.indexOf(HASH_PREFIX) + HASH_PREFIX.length);
                clearScene();
                initLights();
                console.log(route);
                if(presets[route])
                {
                    location.href = location.origin + presets[route];
                }
                else
                {
                    if(route == routes.UPC.name)
                    {
                        initMain();
                    }
                    loadRoute( route, function(){
                        undisplayElement("map-loading");
                        loadMarkers(route);
                        routeChanged(route);
                        show(renderer.domElement);
                        
                    }); 
                    
                }

            }
            else
            {
                goTo(DEFAULT_ROUTE);
            }
        });

    }

    function loadMarkers(route){
        var building = route.split("/")[0];
        var floor = route.split("/")[1];

        if(map.markers && map.markers[building])
        {
            map.markers[building].forEach(function(elem){
                if(!floor || floor == elem.floor)
                {
                    createMarker(elem.color, elem.tag, elem.position, elem.lookAtPoint);
                }

            });
            
        }
    }

    function hide(element, cb){
        element.classList.add("hidden");
        if(cb)
        {
            setTimeout(cb, HIDE_TIME);
            
        }
    }

    function show(element)
    {
        element.classList.remove("hidden");
    }

    function createMarker(color, tag, position, lookAtPoint){
        //var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        var mat = new THREE.MeshLambertMaterial( { color: '#'+color });
        var mesh = new THREE.Mesh( loadedGeometries["marker"].geometry, mat );
        mesh.position.set( 0, 0, 0 );
        mesh.scale.set(MARKER_SCALE, MARKER_SCALE, MARKER_SCALE);
        mesh.position.copy( position);

        //TODO: tag
        var canvas1 = document.createElement('canvas');
        canvas1.width = "32"*tag.length;
        canvas1.height = "128";
        var context1 = canvas1.getContext('2d');
        context1.font = "100 50px sans-serif";
        context1.fillStyle = '#'+color;
        context1.fillText(tag, 0, 50);
        
        // canvas contents will be used for a texture
        var texture1 = new THREE.Texture(canvas1) 
        texture1.needsUpdate = true;
          
        var material1 = new THREE.MeshBasicMaterial( {map: texture1, side:THREE.DoubleSide } );
        material1.transparent = true;
        material1.depthTest= false;

        var mesh1 = new THREE.Mesh(
            new THREE.PlaneGeometry(canvas1.width, canvas1.height),
            material1
          );
        mesh1.position.copy(position);
        mesh1.position.set(mesh1.position.x, mesh1.position.y, mesh1.position.z);
        mesh1.scale.set(TAG_SCALE,TAG_SCALE,TAG_SCALE);
        var point = new THREE.Vector3(lookAtPoint.x, lookAtPoint.y, lookAtPoint.z);
        mesh1.lookAt(point);
        mesh.add( mesh1 );
        


        scene.add(mesh);




    }


    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function loadRoute(route, cb){
        var first = route.split("/")[0];
        var second = route.split("/")[1];
        var loader = new THREE.ObjectLoader();
        if(routes[ first ])
        {
            //Routes without path are considered abstract
            if(routes[ first ].path)
            {
                if(!routes[ first ].scene)
                {
                    loader.load(ASSETS_URL + routes[ first ].path, function(obj){            
                        routes[ first ].scene = obj;
                        debugger;
                        scene.add(obj);
                        if(cb) cb();
                    });
                }
                else
                {
                    scene.add(routes[ first ].scene);
                    if(cb) cb();
                }
            }
            else
            {
                var loadedChildren = 0;
                for(var i = 0; i < routes[first].children.length; i++)
                {
                    if(!second || second == i)
                    {
                        (function(index){
                            if(!routes[ first ].children[ index ].scene)
                            {
                                loader.load(ASSETS_URL + routes[ first ].children[ index ].path, function(obj){
                                    obj.position.y = routes[ first ].children[ index ].offset;
                                    routes[ first ].children[ index ].scene = obj;
                                    scene.add(obj);
                                    loadedChildren++;
                                });
                            }
                            else
                            {
                                scene.add(routes[ first ].children[ index ].scene);
                                loadedChildren++;
                            }          
                        })(i);
                    }
                }

                function checkLoaded(){
                    if( (!second && loadedChildren != routes[first].children.length) ||
                        (second && loadedChildren != 1) )
                        setTimeout(checkLoaded, 100);
                    else
                        if(cb) cb();
                }

                checkLoaded();

                
            }
        }
        else
        {
            //404
            console.warn("Route not found");
            goTo(DEFAULT_ROUTE);
        }
    }

    function routeChanged(route){
        currentRoute = route;
        document.getElementById("map-routeHeader").innerHTML = genRouteTitle(route);
        toggleOutBtn(route);

        var panels = document.querySelectorAll("article");
        for(var i =0; i < panels.length; i++)
        {
            panels[i].classList.remove("active");
        }

        var activePanel = routes[ route.split("/")[0] ].panel;
        if(activePanel)
            document.querySelector("#"+activePanel).classList.add("active");

        var linked = document.querySelectorAll("[data-link-hash]");
        for(i =0; i < linked.length; i++)
        {
            var reg = new RegExp(linked[i].dataset.linkHash);
            if(reg.test(route))
            {
                linked[i].classList.add("active");
            }
            else
            {
                linked[i].classList.remove("active");
            }
        }

    }

    function toggleOutBtn(route){
        var isRoot = routes[ route.split("/")[0] ].root;
        if(!isRoot)
        {
            show(document.getElementById("map-out"));
        }
        else
        {
            hide(document.getElementById("map-out"));
        }
    }

    function genRouteTitle(route){
        var parts = route.split("/");
        return parts[0] + (parts[1] ? (" - " + routes[ parts[0] ].children[ parts[1] ].name) : "");
    }

    function clearScene(){
        for(var i = scene.children.length-1; i >= 0; i--)
        {
            scene.children[i].parent.remove(scene.children[i]);
        }

    }

    function runAnimations(deltaTime){
        if(animated.bee)
        {
            animated.bee.rotation.z += deltaTime;
            animated.bee.position.y = Math.cos(clock.getElapsedTime()*2) * deltaTime + 0.5;
            
        }
    }

    function animate() {

        requestAnimationFrame( animate );
        runAnimations(clock.getDelta());

        controls.update();
        renderer.render( scene, camera );
    }






    init();
    animate();
    
});