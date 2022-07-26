'use strict';
const
    config = require('config'),
    express = require('express'),
    mssql = require('mssql');
var app = express();
var port = process.env.PORT || process.env.port || 5000;
app.set('port', port);
app.use(express.json());
app.listen(app.get('port'), function () {
    console.log('[app.listen] Node app is running on port', app.get('port'));
})
module.exports = app;

var config_db = {
    user: config.get("user"),
    password: config.get("password"),
    database: 'Lung',
    server: '127.0.0.1',
    port: 1433,
    options: {
        encrypt: false, // for azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    }
}
mssql.connect(config_db, function (err) {
    if (err) {
        console.log("Error while connecting database :- " + err);
        return;
    }
    console.log("Database is connected");
});

app.post('/webhook', function (req, res) {
    console.log("[Webhook] in");
    let data = req.body;
    let queryCategory = data.queryResult.parameters["Animal"];
    console.log("queryCategory: " + queryCategory);
    //兩種查詢條件
    //1.查詢4個種類abtype(貓/狗/寵物兔/寵物鼠)
    //2.查詢品種(abvariety)
    let queryFilter = "";
    if (queryCategory == '貓' || '狗' || '兔' || '鼠') {
        queryFilter = `amlType = '${queryCategory}'`;
    } else {
        queryFilter = `amlSpecies = '${queryCategory}'`;
    }
    mssql.query("SELECT * FROM LineAnimalTable where " + queryFilter,
        function (err, body, fields) {
            if (err) throw err;
            else console.log('Selected ' + body.recordset.length + ' row(s).');
            console.log("body: "+JSON.stringify(body));
            sendCards(body, res);
            //body:查詢得到的資料, res:回傳給Dialogflow要用到的方法
            //sensCards:專注在回傳的格式上
        })
});



function sendCards(body, res){
    console.log('[sendCards] In');
    var thisFulfillmentMessages = [];

    //任務一: 傳貼圖
    var stickerObject = {
        payload:{
            line:{
                "type": "sticker",
                "packageId": "8525",
                "stickerId": "16581295"
            }
        }
    }
    thisFulfillmentMessages.push(stickerObject);

    
    var thisFlexObject = {
        payload:{
            line:{
                "type": "flex",
                "altText": "電腦版看不到唷!",
                "contents": {
                    "type": "carousel",
                    "contents": []
                }
            }
        }
    };

    for(var x=0;x<body.recordset.length;x++){
        if(body.recordset[x])

        var thisObject = {
            "type": "bubble",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "名字:"+body.recordset[x].amlName+" 品種:"+body.recordset[x].amlSpecies + " 性別:"+body.recordset[x].amlSex,
                  "weight": "bold",
                  "size": "lg"
                }
              ],
              "width": "100%"
            },
            "hero": {
              "type": "image",
              "size": "full",
              "url": body.recordset[x].amlImage /*body.recordset[x].amlImage*/
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                    "type": "text",
                    "text": "地址:"+body.recordset[x].amlAddress,
                    "weight": "bold",
                    "size": "md"
                },
                {
                  "type": "button",
                  "action": {
                    "type": "uri",
                    "label": "查看詳細",
                    "uri": "http://localhost:8080/Lung/FrontEndAnimalF/animals?keyword="+encodeURI(body.recordset[x].amlSpecies) /*可以接受http開頭*//*body.recordset[x].amlImage*/
                  }
                }
              ]
            }
          };
        
        thisFlexObject.payload.line.contents.contents.push(thisObject);
    }
    
    thisFulfillmentMessages.push(thisFlexObject);






    // var thisLineObject = {
    //     payload:{
    //         line:{
    //             type:"template",
    //             altText: "電腦版看不到唷!",
    //             template:{
    //                 type:"carousel",
    //                 columns:[]
    //             }
    //         }
    //     }
    // };

   for(var x=0;x<body.recordset.length;x++){
    var thisObject = {};
    thisObject.thumbnailImageUrl = body.recordset[x].amlImage /*body.recordset[x].amlImage*/ /*body.recordset[x].Photo*/
    thisObject.imageBackgroundColor = "#FFFFFF";
    thisObject.title = body.recordset[x].amlSpecies;
    thisObject.text = body.recordset[x].amlType + " $"+body.recordset[x].amlType;
    thisObject.defaultAction = {};
    thisObject.defaultAction.type = "uri";
    thisObject.defaultAction.label = "view detail";
    thisObject.defaultAction.uri = body.recordset[x].amlImage /*body.recordset[x].amlImage*/ /*body.recordset[x].Photo*/
    thisObject.actions = [];
    var thisActionObject = {};
    thisActionObject.type = "uri";
    thisActionObject.label = "view detail";
    thisActionObject.uri = body.recordset[x].amlImage /*body.recordset[x].amlImage*/ /*body.recordset[x].Photo*/
    thisObject.actions.push(thisActionObject);
    // push 到columns裡面
    // thisLineObject.payload.line.template.columns.push(thisObject);
    }

    // thisFulfillmentMessages.push(thisLineObject);
    var responseObject = {
        fulfillmentMessages:thisFulfillmentMessages
    };
    res.json(responseObject);
}


