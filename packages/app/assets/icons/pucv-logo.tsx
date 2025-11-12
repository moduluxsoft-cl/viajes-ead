import React from 'react';
import {Image} from 'react-native';

interface PucvLogoProps {
    width: number;
    height: number;
}

const PucvLogo = ({ width, height }: PucvLogoProps) => {
    const aspectRatio = width / height;
    height = width / aspectRatio;
    return (
        <Image
            source={require('@assets/images/PUCV-1.webp')}
            style={[
                {
                    width: width,
                    height: height,
                    resizeMode: "contain"
                },
            ]}
        />
    );
};

export default PucvLogo;

