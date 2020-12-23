const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const app = express()

const apiKey = 'd859b3f2d19d0f2d84d5f8fe9631c20a';
const apiLink = 'https://api.openweathermap.org/data/2.5/weather?units=metric&lang=ru&';
const clientLink = 'http://localhost:63342'
const defaultCityID = Number(1490624);

const Datastore = require('nedb')
const database = new Datastore({ filename: '.data/database', autoload: true })

const corsOptions = {
    origin: clientLink,
    credentials: true,
    methods: 'GET, POST, DELETE, OPTIONS',
    headers: 'Origin, X-Requested-With, Content-Type, Accept'
}

const responseFailed = {
    success: false,
    message: "Couldn't retrieve information from weather server"
}

app.use(express.static('public'))
app.use(express.json())
app.options(cors(corsOptions))
app.use(function (request, response, next) {
    response.header('Access-Control-Allow-Origin', clientLink)
    response.header('Access-Control-Allow-Credentials', true)
    response.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE')
    if (request.method == 'OPTIONS') {
        response.send(200);
    }
    else {
        next()
    }
})
app.listen(3000, () => console.log("Server started!"))

/* endpoints */

app.get('/weather/city', cors(corsOptions), async (request, response) => {
    const city = request.query.q
    const weatherResponse = await getWeatherByName(city)
    console.log('get by city name called')

    response.json(weatherResponse)
})

app.get('/weather/coordinates', cors(corsOptions), async (request, response) => {
    const latitude = request.query.lat
    const longitude = request.query.lon
    const weatherResponse = await getWeatherByCoords(latitude, longitude)

    response.json(weatherResponse)
})

app.get('/weather/id', cors(corsOptions), async (request, response) => {
    const id = request.query.q
    const weatherResponse = await getWeatherByID(id)

    response.json(weatherResponse)
})

app.get('/favourites', cors(corsOptions), (request, response) => {
    let cities = []

    database.find({}, function(error, docs) {
        if (error != null) {
            response.json({ success: false, message: error })
        }
        else if (docs.length === 0) {
            response.json({ success: true, cities: []})
        }
        else {
            response.json({ success: true, cities: docs.map ((obj) => obj.city) })
        }
    })
})
app.get('/weather/default', cors(corsOptions), async (request, response) => {
    const weatherResponse = await getWeatherByID(defaultCityID)

    response.json(weatherResponse)
})

app.get('/favourites/:id', cors(corsOptions), async (request, response) => {
    const id = request.params.id
    const weatherResponse = await getWeatherByID(id)

    response.json(weatherResponse)
})

app.post('/favourites/:city', cors(corsOptions), async (request, response) => {
    const city = request.params.city
    const weatherResponse = await getWeatherByName(city)

    if(weatherResponse.success) {
        database.find({ city: weatherResponse.weather.id }, function(error, docs) {
            if (error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length !== 0) {
                response.json({ success: true, duplicate: true })
            }
            else {
                database.insert({ city: weatherResponse.weather.id}, function() {
                    if (error != null) {
                        response.json({ success: false, message: error })
                    }
                    else {
                        response.json(weatherResponse)
                    }
                })
            }
        })
    }
    else {
        response.json(responseFailed)
    }
})

app.delete('/favourites/:id', cors(corsOptions), (request, response) => {
    const id = Number(request.params.id)

    if(!Number.isInteger(id)) {
        response.json({ success: false, message: 'Incorrect query' })
    }
    else {
        database.find({ city: id }, function(error, docs) {
            if(error != null) {
                response.json({ success: false, message: error })
            }
            else if(docs.length === 0) {
                response.json({ success: false, message: 'City id is not in the list' })
            }
            else {
                database.remove({ city: id }, function(error) {
                    if(error != null) {
                        response.json({ success: false, message: error })
                    }
                    else {
                        response.json({ success: true })
                    }
                })
            }
        })
    }
})

/* weather api stuff */

async function getWeather(url){
    try {
        const response = await fetch(url);
        try {
            const data = await response.json();
            if(data.cod >= 300)
                return { success: false, message: data.message }
            return { success: true, weather: data }
        }
        catch (error) {
            return responseFailed
        }
    }
    catch (error) {
        return { success: false, message: error }
    }
}

function getWeatherByName(cityName){
    const requestURL = apiLink + 'q=' + encodeURI(cityName) + '&appid=' + apiKey;
    return getWeather(requestURL);
}

function getWeatherByID(cityID){
    const requestURL = apiLink + 'id=' + encodeURI(cityID) + '&appid=' + apiKey;
    return getWeather(requestURL);
}

function getWeatherByCoords(latitude, longitude){
    const requestURL = apiLink + 'lat=' + encodeURI(latitude) + '&lon=' + encodeURI(longitude) + '&appid=' + apiKey;
    return getWeather(requestURL);
}