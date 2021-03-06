﻿let restaurants,
  neighborhoods,
  cuisines,
  favs_only = false;
var map;
var markers = [];


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {    
    updateRestaurants();
    fetchNeighborhoods();
    fetchCuisines();       
});


/**
 * Fetch all neighborhoods and set their HTML.
 */
var fetchNeighborhoods = () => {
    window.localforage.getItem(NEIBOURHOUDS_DBNAME, function(err, neighborhoods) {
        if (neighborhoods) {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        } else {
            DBHelper.fetchNeighborhoods((error, neighborhoods) => {
                if (error) { // Got an error
                    console.error(error);
                } else {
                    self.neighborhoods = neighborhoods;
                    fillNeighborhoodsHTML();
                }
            });
        }
    });

}


/**
 * Set neighborhoods HTML.
 */
var fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
}


/**
 * Fetch all cuisines and set their HTML.
 */
var fetchCuisines = () => {

    window.localforage.getItem(CUISINE_DBNAME, function(err, cuisines) {
        if (cuisines) {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        } else {
            DBHelper.fetchCuisines((error, cuisines) => {
                if (error) { // Got an error!
                    console.error(error);
                } else {
                    self.cuisines = cuisines;
                    fillCuisinesHTML();
                }
            });
        }
    });

}


/**
 * Set cuisines HTML.
 */
var fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}


/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    
    //add functionality to toggle buttons:
    var toggleFavCustom = document.getElementById('toggle_fav_custom');
    const toggleFav =  document.getElementById('toggle_fav');
    toggleFav.onclick = function(){
        favs_only  = (toggleFav.checked == "checked" || toggleFav.checked === true);
        toggleFavCustom.setAttribute("aria-checked",favs_only);
        updateRestaurants();
    }

    //support A11y for the custom toggle button:
    toggleFavCustom.onkeyup = function(e){
        //if(e.keyCode == 32){ //press spacebar
        if(e.keyCode == 13){ //press enter
            favs_only  = !(toggleFav.checked == "checked" || toggleFav.checked === true);
            toggleFav.checked = favs_only;
            toggleFavCustom.setAttribute("aria-checked",favs_only);
            updateRestaurants();  
        }
    }

    const m = document.getElementById('map');
   
    //start observing map to enter the view:
    var observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0) {
                showMap(entry.target);
                observer.unobserve(entry.target);
            }
        });
    });    
    observer.observe(m);
}


/**
 * Show Google map when being in the view
 */
var showMap = function(m){
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    self.map = new google.maps.Map(m, {
        zoom: 12,
        center: loc,
        scrollwheel: false
    });  

    addMarkersToMap();
};


/**
 * Update page and map for current restaurants.
 */
var updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    const map = document.getElementById('map-container');
    map.setAttribute('aria-label', `map of ${cuisine} restaurants in ${neighborhood} neighborhood`);
  
    if(favs_only){
        DBHelper.fetchFavoriteRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
            if (error) { // Got an error!
                console.error(error);
            } else {
                resetRestaurants(restaurants);
                fillRestaurantsHTML();
            }
        })
    }else {
        DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
            if (error) { // Got an error!
                console.error(error);
            } else {
                resetRestaurants(restaurants);
                fillRestaurantsHTML();
            }
        })
    }
}


/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
var resetRestaurants = (restaurants) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    if(self.markers){
        self.markers.forEach(m => m.setMap(null));
        self.markers = [];
    }
    self.restaurants = restaurants;
}


/**
 * Create all restaurants HTML and add them to the webpage.
 */
var fillRestaurantsHTML = (restaurants = self.restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });

    //start observing images to enter the view:
    const myImgs = document.querySelectorAll('.restaurant-img');
    var observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0) {
                setImageSrc(entry.target);
                observer.unobserve(entry.target);
            }
        });
    });
    myImgs.forEach(image => {
        observer.observe(image);
    });

    // add markers to the map:
    if(self.map && restaurants)
        addMarkersToMap();
}


/**
 * Create restaurant HTML.
 */
var createRestaurantHTML = (restaurant) => {
  
    const li = document.createElement('li');

    const image = document.createElement('img');
    let imageSrc = DBHelper.imageUrlForRestaurant(restaurant);
    image.setAttribute("data-src",imageSrc);    
    if(imageSrc !== undefined)
        image.setAttribute('alt', `photo of ${restaurant.name} restaurant`);    
    else
        image.setAttribute('alt', 'photo not available');

    image.className = 'restaurant-img';
    li.append(image);

    const name = document.createElement('h3');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const favBTN = document.createElement('input');
    favBTN.setAttribute("type","button");
    favBTN.className = 'rating fav left';
    //convert is_favorite from string, if it's, to boolean:
    restaurant.is_favorite = ((restaurant.is_favorite == "true") || restaurant.is_favorite == true);

    //set the star appropriately:
    if(restaurant.is_favorite === true){
        favBTN.value = '\u2726';
        favBTN.classList.add('gold');
        favBTN.setAttribute("title","Remove from favorites");
        favBTN.setAttribute('aria-label',`remove ${restaurant.name} from favorites`);
    }else{
        favBTN.value = '\u2727';
        favBTN.setAttribute("title","Add to favorites");
        favBTN.setAttribute('aria-label',`add ${restaurant.name} to favorites`);
    }    
    favBTN.onclick = function(){
        restaurant.is_favorite = !restaurant.is_favorite;
        DBHelper.toggleFavorite(restaurant.id,restaurant.is_favorite).then((data) => {
            DBHelper.updateFavoriteStatus(favBTN,restaurant);
        });
    }
    li.append(favBTN);

    const more = document.createElement('a');
    more.innerHTML = 'View Details';
    more.setAttribute('aria-label',`View Details about ${restaurant.name}`);
    more.href = DBHelper.urlForRestaurant(restaurant);
    li.append(more)

    return li
}


/**
 * Fetch the image src if in the view
 */
var setImageSrc =function(image){
    let imageSrc = image.getAttribute('data-src');
    image.setAttribute("data-src",imageSrc);
 
    if(imageSrc !== 'undefined'){
        /* remove the image extention */
        imageSrc = imageSrc.replace(/\.jpg$/, '');
        image.setAttribute('srcset', `${imageSrc}-300px.webp 300w, ${imageSrc}-420px.webp 400w, ${imageSrc}-650px.webp 600w`);
        image.setAttribute('sizes', '(max-width: 667px) 90vw, 300px');
        image.src = `${imageSrc}-300px.jpg`;
    }else{
        image.src = '/img/icon-no-image.png';
    }
}


/**
 * Add markers for current restaurants to the map.
 */
var addMarkersToMap = (restaurants = self.restaurants) => {
    restaurants.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        self.markers.push(marker);
    });
}

