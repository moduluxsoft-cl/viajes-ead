import React from 'react';
import {Image} from 'react-native';

const PucvLogo = () => {
    const width = 40;
    const aspectRatio = width / 42;
    const height = width / aspectRatio;
    return (
        <Image
            source={require('../images/PUCV-1.webp')}
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

