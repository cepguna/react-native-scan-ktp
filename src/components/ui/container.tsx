import { View, type ViewProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

type Props = {
  children: React.ReactNode;
} & ViewProps;

export const Container: React.FC<Props> = ({ children, ...rest }) => {
  return (
    <View {...rest} className={twMerge('px-4', rest.className)}>
      {children}
    </View>
  );
};
