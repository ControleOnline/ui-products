import React from 'react';
import {View, FlatList, Image} from 'react-native';
import css from '@controleonline/ui-orders/src/react/css/orders';

const Carousel = ({images}) => {
  const {styles} = css();

  const renderItem = ({item}) => {
    const imageUrl = `https://api.controleonline.com/files/${item.file.id}/download`;

    return (
      <View style={[styles.slide, {width: 100, height: 100}]}>
        <Image
          source={{uri: imageUrl}}
          style={[styles.image, {width: '100%', height: '100%'}]}
          resizeMode="cover"
        />
      </View>
    );
  };

  return (
    <View style={[styles.slidecontainer, {width: '100%', height: '100%'}]}>
      <FlatList
        data={images}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center"
        decelerationRate="fast"
        snapToInterval={100}
      />
    </View>
  );
};

export default Carousel;
