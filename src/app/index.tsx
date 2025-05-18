/* eslint-disable max-lines-per-function */
import FaceDetection from '@react-native-ml-kit/face-detection';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { Button, FocusAwareStatusBar, Text } from '@/components/ui';
import { useCameraStore } from '@/stores/use-camera-store';

const { width } = Dimensions.get('screen');

interface DocumentType {
  title: string;
  value: 'ktp' | 'face';
}

const DOCUMENT_TYPES: DocumentType[] = [
  { title: 'KTP', value: 'ktp' },
  { title: 'Pas Foto', value: 'face' },
];

interface ValidationState {
  isKtpValid: boolean;
  isKtpFaceValid: boolean;
  isFaceValid: boolean;
  ktpText: string;
}

const useImageValidation = () => {
  const { ktp, face } = useCameraStore();
  const [validation, setValidation] = useState<ValidationState>({
    isKtpValid: false,
    isKtpFaceValid: false,
    isFaceValid: false,
    ktpText: '',
  });
  const [hasRead, setHasRead] = useState({ ktp: false, face: false });

  const extractNIK = useCallback((text: string): string | null => {
    const nikRegex = /:\s*;\s*(\d{16})|:\s*(\d{16})|(\b[\d|l]{16}\b)/;
    const match = text.match(nikRegex);

    if (!match) return null;

    const nik = match[1] || match[2] || match[3];
    if (!nik) return null;

    const cleanedNik = nik.replace(/l/g, '1');
    return /^\d{16}$/.test(cleanedNik) ? cleanedNik : null;
  }, []);

  const validateImage = useCallback(
    async (base64: string, type: 'ktp' | 'face') => {
      try {
        const { uri } = await ImageManipulator.manipulateAsync(
          `data:image/png;base64,${base64}`,
          [],
          { format: ImageManipulator.SaveFormat.PNG }
        );

        if (type === 'ktp') {
          const [textResult, faceResult] = await Promise.all([
            TextRecognition.recognize(uri),
            FaceDetection.detect(uri, { landmarkMode: 'all' }),
          ]);

          const nik = extractNIK(textResult.text);
          setValidation((prev) => ({
            ...prev,
            isKtpValid: !!nik,
            isKtpFaceValid: faceResult.length > 0,
            ktpText: nik || '',
          }));
        } else {
          const faceResult = await FaceDetection.detect(uri, {
            landmarkMode: 'all',
          });
          setValidation((prev) => ({
            ...prev,
            isFaceValid: faceResult.length > 0,
          }));
        }
      } catch {
        showMessage({ message: `Gagal membaca ${type}`, type: 'danger' });
      }
    },
    [extractNIK]
  );

  useEffect(() => {
    if (ktp && !hasRead.ktp) {
      validateImage(ktp, 'ktp');
      setHasRead((prev) => ({ ...prev, ktp: true }));
    }
  }, [ktp, hasRead.ktp, validateImage]);

  useEffect(() => {
    if (face && !hasRead.face) {
      validateImage(face, 'face');
      setHasRead((prev) => ({ ...prev, face: true }));
    }
  }, [face, hasRead.face, validateImage]);

  return { validation, setHasRead };
};

const DocumentCard: React.FC<{
  type: DocumentType;
  imageUri: string | null;
  validation: ValidationState;
  onUpload: (type: string) => void;
  setHasRead: React.Dispatch<
    React.SetStateAction<{ ktp: boolean; face: boolean }>
  >;
}> = ({ type, imageUri, validation, onUpload, setHasRead }) => {
  const handlePress = useCallback(() => {
    if (type.value === 'ktp') {
      setHasRead((prev) => ({ ...prev, ktp: false }));
    }
    onUpload(type.value);
  }, [type.value, onUpload, setHasRead]);

  return (
    <View className="mb-4 w-full flex-1 items-center justify-center overflow-hidden rounded-xl border border-primary-400">
      {imageUri ? (
        <>
          <Image
            source={{ uri: imageUri }}
            className="h-full"
            resizeMode="contain"
            style={{ width }}
          />
          {type.value === 'ktp' && (
            <Text className="absolute bottom-0">
              No KTP: {validation.ktpText} -{' '}
              {validation.isKtpValid && validation.isKtpFaceValid
                ? 'Valid'
                : 'Tidak Valid'}
            </Text>
          )}
          {type.value === 'face' && (
            <Text className="absolute bottom-0">
              Face Detection: {validation.isFaceValid ? 'Valid' : 'Tidak Valid'}
            </Text>
          )}
          <Button
            className="absolute right-0 top-0"
            label="Edit"
            onPress={handlePress}
          />
        </>
      ) : (
        <View className="items-center">
          <Button label="Camera" onPress={handlePress} />
          <Text>{type.title}</Text>
        </View>
      )}
    </View>
  );
};

export default function Screen() {
  const { ktp, face } = useCameraStore();
  const router = useRouter();
  const { validation, setHasRead } = useImageValidation();

  const getImageUri = useCallback(
    (type: string): string | null => {
      if (type === 'ktp' && ktp) return `data:image/png;base64,${ktp}`;
      if (type === 'face' && face) return `data:image/png;base64,${face}`;
      return null;
    },
    [ktp, face]
  );

  const handleUpload = useCallback(
    (type: string) => {
      router.navigate({ pathname: '/camera', params: { type } });
    },
    [router]
  );

  const handleSubmit = useCallback(async () => {
    if (!ktp) {
      showMessage({ message: 'Foto KTP terlebih dahulu', type: 'danger' });
      return;
    }
    if (!face) {
      showMessage({ message: 'Foto pas foto terlebih dahulu', type: 'danger' });
      return;
    }
    if (!validation.isKtpValid) {
      showMessage({
        message: 'Foto KTP tidak terbaca dengan baik, silahkan foto ulang',
        type: 'danger',
      });
      return;
    }
    showMessage({ message: 'Berhasil disimpan', type: 'success' });
  }, [ktp, face, validation.isKtpValid]);

  return (
    <>
      <FocusAwareStatusBar />
      <View className="flex flex-1 justify-between p-4">
        <View className="flex-1">
          {DOCUMENT_TYPES.map((type) => (
            <DocumentCard
              key={type.value}
              type={type}
              imageUri={getImageUri(type.value)}
              validation={validation}
              onUpload={handleUpload}
              setHasRead={setHasRead}
            />
          ))}
        </View>
        <Button className="mb-4" onPress={handleSubmit} label="Lanjut" />
      </View>
    </>
  );
}

