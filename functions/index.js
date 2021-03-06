const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const app = express();
const { query } = require('express');

app.use(cors({ origin: true }));
admin.initializeApp({
    databaseURL: "https://fir-api-9a206..firebaseio.com",
    storageBucket: "gs://imagerepository-b7a29.appspot.com"
});


const db = admin.firestore();
var bucket = admin.storage().bucket();

// get images based on image keywords
app.get('/api/images/', (req, res) => {
    (async () => {
        try {
            var numberOfQueryParamters = Object.keys(req.query).length
            var response = []
            //If no query paramters are passed, return all images
            if (numberOfQueryParamters === 0) {
                response = await getAllImages();
            } else { //If there's at least one query paramter
                for (var i = 0; i < Object.keys(req.query).length; i++) {
                    var queryParamter = Object.keys(req.query)[i]
                    if (queryParamter === "colors" || queryParamter === "keywords") {
                        response = await filterResponseByColorOrKeywords(queryParamter, req.query, response)
                    } else if (queryParamter === "photographerName") {
                        response = await filterResponseByPhotographerName(req.query, response)
                    } else if (queryParamter === "similarImage"){
                        response = await filterResponseBySimilarImage(req)
                    }
                }
            }

            if(response.length === 0){
                response.push("No results were found. Either narrow down your search criteria or make sure your query parameters are correctly spelled")
            }
            return res.status(200).send(response);
        } catch (error) {
            console.log(error)
            return res.status(500).send(error);
        }
    })();
});

async function filterResponseBySimilarImage(request) {
    var result = []
    await db.doc("images/" + request.query.similarImage)
        .get()
        .then(async querySnapshot => {
            await db.collection("images")
                .where("keywords", "array-contains-any", querySnapshot.data().keywords)
                .get()
                .then(snapshot => {
                    snapshot.forEach(snapshotValue => {
                        var documentSnapshotWithId = 
                        {
                            ...snapshotValue.data(),
                            id: snapshotValue.id
                        }
                        result.push(documentSnapshotWithId)
                    })
                    return;
                })
            return;
        })
    return result
}

async function filterResponseByPhotographerName(query, response) {
    var result = []
    if (response.length === 0) {
        await db.collection('images')
            .where("photographerName", "==", query.photographerName)
            .get()
            .then(querySnapshot => {
                querySnapshot.forEach(documentSnapshot => {
                    var documentSnapshotWithId = 
                    {
                        ...documentSnapshot.data(),
                        id: documentSnapshot.id
                    }
                    result.push(documentSnapshotWithId);
                })
                return;
            })
    } else {
        for (var i = 0; i < response.length; i++) {
            var image = response[i]
            if (image.photographerName === query.photographerName) {
                result.push(image);
            }
        }
    }

    return result;

}

async function filterResponseByColorOrKeywords(queryParamter, query, response) {
    var result = []
    if (queryParamter === "colors") {
        if (response.length === 0) {
            await db.collection('images')
                .where("colors", "array-contains-any", JSON.parse(query.colors))
                .get()
                .then(querySnapshot => {
                    querySnapshot.forEach(documentSnapshot => {
                        var documentSnapshotWithId = 
                        {
                            ...documentSnapshot.data(),
                            id: documentSnapshot.id
                        }
                        result.push(documentSnapshotWithId);
                    })
                    return;
                })
        } else {
            for (var i = 0; i < response.length; i++) {
                var image = response[i]
                if (image.colors.some(color => query.colors.indexOf(color) >= 0)) {
                    result.push(image);
                }
            }
        }
    } else {
        if (response.length === 0) {
            await db.collection('images')
                .where("keywords", "array-contains-any", JSON.parse(query.keywords))
                .get()
                .then(querySnapshot => {
                    querySnapshot.forEach(documentSnapshot => {
                        var documentSnapshotWithId = 
                        {
                            ...documentSnapshot.data(),
                            id: documentSnapshot.id
                        }
                        result.push(documentSnapshotWithId);
                    })
                    return;
                })
        } else {
            for (var j = 0; j < response.length; j++) {
                var img = response[j]
                if (img.keywords.some(keyword => query.keywords.indexOf(keyword) >= 0)) {
                    result.push(img);
                }
            }
        }
    }

    return result;
}

async function getAllImages() {
    var response = []
    await db.collection('images')
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(documentSnapshot => {
                var documentSnapshotWithId = 
                {
                    ...documentSnapshot.data(),
                    id: documentSnapshot.id
                }
                response.push(documentSnapshotWithId);
            })
            return;
        })

    return response
}


exports.app = functions.https.onRequest(app);