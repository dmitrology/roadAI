import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';
import Constants from 'expo-constants';
import { Camera, CameraType } from 'expo-camera';
import * as Location from "expo-location";
import * as MediaLibrary from 'expo-media-library';
import Button from './src/components/Button';

const b64toBlob = (base64, type = 'application/octet-stream') => 
  fetch(`data:${type};base64,${base64}`).then(res => res.blob())

export default function App() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
  const cameraRef = useRef(null);

  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      MediaLibrary.requestPermissionsAsync();
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');
      console.log("requesting location permission");
      console.log("image", image);
      const s = await Location.requestForegroundPermissionsAsync();
      console.log("got location permission")
      setStatus(s)
  
      if (status !== "granted") {
        alert(
          "Insufficient permissions!",
          "Sorry, we need location permissions to make this work!",
          [{ text: "Okay" }]
        );
        return;
      }
    })();
  }, []);
  
  const takePicture = async () => {
    if (cameraRef) {
      try {
        const data = await cameraRef.current.takePictureAsync({
          base64: true
        });
        setImage(data);
        // TODO: Investigate blob, it is failing
        // const blob = await b64toBlob(data)
        sendRequest({blob: data, uri: data.uri})
        console.log("Successfully uploaded image to AWS")
      } catch (error) {
        console.log("Failed upload to AWS")
        console.log(error);
      }
    }
  };

  const savePicture = async () => {
    console.log("start saving picture.")
    if (image) {
      console.log("image is valid. proceeding to save image on device.")
      console.log(image)
      try {
        const asset = await MediaLibrary.createAssetAsync(image.uri);
        console.log(asset)
        setImage(null);
        console.log('saved successfully');
      } catch (error) {
        console.log(error);
      }
    }
  };

  if (hasCameraPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      {!image ? (
        <Camera
          style={styles.camera}
          type={type}
          ref={cameraRef}
          flashMode={flash}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 30,
            }}
          >
            <Button
              title=""
              icon="retweet"
              onPress={() => {
                setType(
                  type === CameraType.back ? CameraType.front : CameraType.back
                );
              }}
            />
            <Button
              onPress={() =>
                setFlash(
                  flash === Camera.Constants.FlashMode.off
                    ? Camera.Constants.FlashMode.on
                    : Camera.Constants.FlashMode.off
                )
              }
              icon="flash"
              color={flash === Camera.Constants.FlashMode.off ? 'gray' : '#fff'}
            />
          </View>
        </Camera>
      ) : (
        <Image source={{ uri: image }} style={styles.camera} />
      )}

      <View style={styles.controls}>
        {image ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 50,
            }}
          >
            <Button
              title="Re-take"
              onPress={() => setImage(null)}
              icon="retweet"
            />
            <Button title="Save" onPress={savePicture} icon="check" />
          </View>
        ) : (
          <Button title="Take a picture" onPress={takePicture} icon="camera" />
        )}
      </View>
    </View>
  );
}

// this function converts the generic JS ISO8601 date format to the specific format the AWS API wants
function getAmzDate(dateStr) {
  var chars = [":","-"];
  for (var i=0;i<chars.length;i++) {
    while (dateStr.indexOf(chars[i]) != -1) {
      dateStr = dateStr.replace(chars[i],"");
    }
  }
  dateStr = dateStr.split(".")[0] + "Z";
  return dateStr;
}

const config = {
  method: 'PUT',
  headers: { 
    'X-Amz-Date': getAmzDate(new Date().toISOString()), 
    'Authorization': 'AWS4-HMAC-SHA256 Credential=AKIA4SEW72LJH44RKOKM/20230102/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=17070f06137b9817f36664651075d46b252ca8fac575f88b66ee981d79751317', 
    'Content-Type': 'image/jpeg'
  }
};

async function sendRequest(data) {
  config.body = JSON.stringify({ image: data.blob });
  let response
  try {
    const path = data.uri
    response = await fetch("https://wotnjdu5ak.execute-api.us-east-1.amazonaws.com/prod/upload/roadphoto/" + 'image' + path.slice(path.length - 10), config);
    console.log(response)
    console.log("SUCCESSFULLY UPLOADED IMAGE TO AWS")
  } catch (error) {
    console.log("QUERY ERROR");
    console.log(error)
  } try{ 
    console.log("RESPONSE.DATA SUCCESS");
    console.log(response)
  } catch (error) {
    console.log("RESPONSE.DATA ERROR")
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    rddingTop: Constants.statusBarHeight,
    backgroundColor: '#000',
    padding: 8,
  },
  controls: {
    flex: 0.5,
  },
  button: {
    height: 40,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#E9730F',
    marginLeft: 10,
  },
  camera: {
    flex: 5,
    borderRadius: 20,
  },
  topControls: {
    flex: 1,
  },
});
