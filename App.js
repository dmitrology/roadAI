import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Constants from 'expo-constants';
import { Camera, CameraType } from 'expo-camera';
import * as Location from "expo-location";
import * as MediaLibrary from 'expo-media-library';
import Button from './src/components/Button';
import axios from 'axios';

const sendImage = async (image) => {
  console.log("here: ", image)
  const formData = new FormData();
  formData.append('image', {
    uri: image.uri,
    type: image.type,
    name: image.fileName
  });

  let data

  try {
    const response = await fetch('https://lnatchxqed.execute-api.us-east-1.amazonaws.com/roadDataReciever?fileName=' + image.uri, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      //body: formData
    });
    data = await response.json();
    console.log("URLfromroadDataReciever", data.fileUploadURL)
    const response2 = await fetch(data.fileUploadURL, {
      method: 'PUT',
      headers: { "Content-Type": "multipart/form-data" },
      body: image.uri
      //body: formData

      
    });

  } catch (error) {
    console.log("failed getting secure url: ", error);
  }

  try {
    console.log("trying to upload")
    // post the image direclty to the s3 bucket
    await fetch(data.fileUploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg"
      },
      //Need to make a button 
      body: image.uri
    })
    console.log("uploaded")
  } catch(e) {
    console.log("failed to upload image to s3: ", e)
  }
};


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
      console.log("requesting location permission")
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

  useEffect(() => {
      const interval = setInterval(async () => {
        if (cameraRef) {
          const data = await cameraRef.current.takePictureAsync();
          console.log(data);
          setImage(data.uri);
          console.log("getting location")
          let location = await Location.getCurrentPositionAsync({});
          console.log("got location")
          try {
            await sendImage(data)
            // do something with the data
          } catch (error) {
            console.error(error);
          }
          //updateState(location);
        }
      }, 5000);
      return () => clearInterval(interval);
    }, []);
    const takePicture = async () => {
    if (cameraRef) {
      try {
        const data = await cameraRef.current.takePictureAsync();
        console.log(data);
        setImage(data.uri);
      } catch (error) {
        console.log(error);
      }
    }
  };

  const savePicture = async () => {
    if (image) {
      try {
        const asset = await MediaLibrary.createAssetAsync(image);
        alert('Picture saved! 🎉');
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
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
