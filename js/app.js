document.addEventListener("DOMContentLoaded", function(){

    var scene, camera, renderer, controls;
    var geometry, material, mesh;

    var raycaster;
    var mouse;
    var currentRoute;
    var markerGeometry;

    var clickEvents= {};
    var helpOpen = false;
    var optsOpen = false;
    var addingMarker = false;

    var ASSETS_URL = "assets/";
    var HASH_PREFIX = "/map/";
    var DEFAULT_ROUTE = "UPC";
    var HIDE_TIME = 200;
    var MARKER_SCALE = 0.05;
    var TAG_SCALE = 0.05;

    var assets = {
        marker: "marker.json"
    };

    var map = {};
    var routes = {
        UPC:
        {
            path: "main.json",
            name: "UPC",
            root: true,
            scene: null
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

        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 10000 );
        camera.position.z = -4;
        camera.position.y = 4;
        camera.position.x = 0;




        //Renderer
        renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.setClearColor(0xffffff);
        controls = new THREE.OrbitControls(camera, renderer.domElement),

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
        loader.load( ASSETS_URL + assets.marker, function( geometry ) {
            markerGeometry = geometry;
        });

        cb();
    }

    function initEvents(){
        window.addEventListener( 'resize', onWindowResize, false );
        document.querySelector("canvas").addEventListener("mousemove",onMouseMove);
        document.querySelector("canvas").addEventListener("click",onMouseClick);
        window.addEventListener("hashchange",onHashChange);
        document.getElementById("map-helpbtn").addEventListener("click", function(){
            toggleHelp("click");
        });
        document.getElementById("map-helpbtn").addEventListener("touchend", function(){
            toggleHelp("touch");
        });
        document.getElementById("map-help-click").addEventListener("click", toggleHelp);
        document.getElementById("map-help-touch").addEventListener("touchend", toggleHelp);
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

        clickEvents["A5"] = function(){
            goTo(routes.A5.name);
        };

        clickEvents["A6"] = function(){
            goTo(routes.A6.name);
        };

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

    function genLink(cam, mark){
        var share = {};
        if(cam)
        {
            share.camCoords = {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            };

            share.camCenter = {
                x: controls.center.x,
                y: controls.center.y,
                z: controls.center.z
            };
        }

        if(map && map.markers)
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

        map.markers = map.markers || {};
        map.markers[building] = map.markers[building] || [];
        map.markers[building].push({
            floor: floor,
            color: color,
            position: position,
            tag: tag,
            lookAtPoint: lookAtPoint
        });

        var auxmap = loadFromStorage("map");
        auxmap.markers = auxmap.markers || {};
        auxmap.markers[building] = auxmap.markers[building] || [];
        auxmap.markers[building].push({
            floor: floor,
            color: color,
            position: position,
            tag: tag,
            lookAtPoint: lookAtPoint
        });

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
        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.8 );
        hemiLight.color.setHSL( 0.6, 1, 0.6 );
        hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        hemiLight.position.set( 0, 500, 0 );

        var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.color.setHSL( 0.1, 1, 0.95 );
        dirLight.position.set( -1, 1.75, 1 );
        dirLight.position.multiplyScalar( 50 );
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
        

        scene.add( hemiLight );
        scene.add( dirLight );
    }


    function onMouseMove( event ) {

        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;     

    }

    function onMouseClick(){
        mousePick();
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
                clearScene();
                initLights();
                var route = window.location.hash.slice(window.location.hash.indexOf(HASH_PREFIX) + HASH_PREFIX.length);
                loadRoute( route, function(){
                    undisplayElement("map-loading");
                    loadMarkers(route);
                    routeChanged(route);
                    show(renderer.domElement);
                    
                }); 

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
        var mesh = new THREE.Mesh( markerGeometry, mat );
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

    function mousePick(){
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
            loadRoute("cube");
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

    function animate() {

        requestAnimationFrame( animate );

        //mousePick(); hover needed?

        controls.update();
        renderer.render( scene, camera );
    }






    init();
    animate();
    
});