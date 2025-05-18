import { useCallback, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { Camera } from 'react-native-vision-camera';

import { useAccessStore } from '@/stores/use-access-store';

export const useAccessCamera = () => {
  const { setCamera } = useAccessStore();
  const requestAndroidCameraPermission = useCallback(async () => {
    try {
      const permissionGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: '<your title here>',
          message: '<your message here>',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );
      console.log('permi', permissionGranted);
      console.log('xxxx', PermissionsAndroid.RESULTS.GRANTED);
      // then access permission status
      // if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      //   // permissons have been accepted - update a useState() here or whatever your usecase is :)
      // }
    } catch (err) {
      console.warn('wrn err', err);
    }
  }, []);
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        requestAndroidCameraPermission();
      }
      const status = await Camera.requestCameraPermission();
      setCamera({
        hasPermission: status === 'granted',
        isActive: true,
      });
    })();
  }, [requestAndroidCameraPermission]);
};
