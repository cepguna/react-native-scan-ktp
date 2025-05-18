import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CameraFace } from '@/components/camera-face';
import { CameraKtp } from '@/components/camera-ktp';

export default function Camera() {
  const { type } = useLocalSearchParams<{ type: string }>();

  return (
    <View className="flex-1">
      {type === 'ktp' && <CameraKtp />}
      {type === 'face' && <CameraFace />}
    </View>
  );
}
