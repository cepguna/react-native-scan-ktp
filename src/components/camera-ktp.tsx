/* eslint-disable max-lines-per-function */
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { Defs, Mask, Rect, Svg } from 'react-native-svg';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useSharedValue, Worklets } from 'react-native-worklets-core';
import { crop } from 'vision-camera-cropper';

import { useAccessCamera } from '@/lib/hooks/use-access-camera';
import { useAccessStore } from '@/stores/use-access-store';
import { useCameraStore } from '@/stores/use-camera-store';

import { Button, Container, Text } from './ui';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

const DEFAULT_CROP_REGION: CropRegion = {
  left: 10,
  top: 20,
  width: 80,
  height: 30,
};

const useCameraCapture = () => {
  const { setCamera, camera } = useAccessStore();
  const { setKtp, setKtpUri } = useCameraStore();
  const router = useRouter();
  const shouldTake = useSharedValue(false);
  const [loading, setLoading] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const capture = useCallback(() => {
    shouldTake.value = true;
    setLoading(true);
  }, [shouldTake]);

  const toggleTorch = useCallback(() => {
    setIsTorchOn((prev) => !prev);
  }, []);

  const onCaptured = useCallback(
    (base64: string, path: string) => {
      setCamera({ ...camera, isActive: false });
      setLoading(false);
      setKtp(base64);
      setKtpUri(path);
      router.navigate('/');
    },
    [camera, setCamera, setKtp, setKtpUri, router]
  );

  const onCapturedJS = Worklets.createRunOnJS(onCaptured);

  return { capture, onCapturedJS, shouldTake, loading, isTorchOn, toggleTorch };
};

const useCropRegion = () => {
  const [cropRegion, setCropRegion] = useState<CropRegion>(DEFAULT_CROP_REGION);
  const cropRegionShared = useSharedValue<CropRegion | undefined>(undefined);

  const getFrameSize = useCallback(
    () => ({
      width: SCREEN_WIDTH,
      height: Math.round(SCREEN_HEIGHT),
    }),
    []
  );

  const adaptCropRegion = useCallback(() => {
    const { width } = getFrameSize();
    const regionWidth = 0.8 * width;
    const desiredRegionHeight = regionWidth / (85.6 / 54);
    const height = Math.ceil(
      (desiredRegionHeight / getFrameSize().height) * 100
    );

    const region: CropRegion = {
      left: 10,
      width: 80,
      top: 20,
      height,
    };

    setCropRegion(region);
    cropRegionShared.value = region;
  }, [getFrameSize, cropRegionShared]);

  useEffect(() => {
    adaptCropRegion();
  }, [adaptCropRegion]);

  return { cropRegion, cropRegionShared, getFrameSize };
};

const CameraOverlay: React.FC<{
  cropRegion: CropRegion;
  getFrameSize: () => { width: number; height: number };
}> = ({ cropRegion, getFrameSize }) => {
  const cropWidth = (cropRegion.width / 100) * getFrameSize().width;
  const cropHeight = (cropRegion.height / 100) * getFrameSize().height;
  const cropX = (cropRegion.left / 100) * getFrameSize().width;
  const cropY = (cropRegion.top / 100) * getFrameSize().height;

  return (
    <BlurView
      className="z-50"
      intensity={50}
      tint="dark"
      style={StyleSheet.absoluteFill}
    >
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Mask
            id="mask"
            x="0"
            y="0"
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
          >
            <Rect width="100%" height="100%" fill="white" />
            <Rect
              x={cropX}
              y={cropY}
              width={cropWidth}
              height={cropHeight}
              fill="black"
              rx={10}
            />
          </Mask>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#mask)"
        />
      </Svg>
    </BlurView>
  );
};

export function CameraKtp() {
  useAccessCamera();
  const { camera } = useAccessStore();
  const router = useRouter();
  const [loadingFirstTime, setLoadingFirstTime] = useState(true);
  const device = useCameraDevice('back');
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 60 },
  ]);
  const { capture, onCapturedJS, shouldTake, loading, isTorchOn, toggleTorch } =
    useCameraCapture();
  const { cropRegion, cropRegionShared, getFrameSize } = useCropRegion();

  useEffect(() => {
    const timer = setTimeout(() => setLoadingFirstTime(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (shouldTake.value && cropRegionShared.value) {
        shouldTake.value = false;
        const result = crop(frame, {
          cropRegion: cropRegionShared.value,
          includeImageBase64: true,
          saveAsFile: true,
        });
        if (result.base64 && result.path) {
          onCapturedJS(result.base64, result.path);
        }
      }
    },
    [onCapturedJS]
  );

  if (loadingFirstTime || loading) {
    return <ActivityIndicator size="large" />;
  }

  if (!device || !camera.hasPermission) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Camera
        style={StyleSheet.absoluteFill}
        isActive={camera.isActive}
        device={device}
        format={format}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
        torch={isTorchOn ? 'on' : 'off'}
      />
      <CameraOverlay cropRegion={cropRegion} getFrameSize={getFrameSize} />
      <Container className="absolute top-40 z-50 w-full items-center justify-center">
        <Text>Pastikan KTP Pas Didalam Kotak</Text>
      </Container>
      <Container className="absolute bottom-6 z-50 w-full items-center justify-center">
        <Button onPress={capture} label="Camera" />
      </Container>
      <Container className="absolute bottom-6 left-4 z-50">
        <Button onPress={() => router.replace('/')} label="ChevronLeft" />
      </Container>
      <Container className="absolute bottom-6 right-4 z-50">
        <Button
          onPress={toggleTorch}
          label={!isTorchOn ? 'Flash Off' : 'Flash On'}
        />
      </Container>
    </View>
  );
}

