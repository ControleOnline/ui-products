import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styles from './ProductDetailsTabBar.styles';

const resolveTabLabel = (route, descriptors) => {
  const options = descriptors?.[route.key]?.options || {};

  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }

  if (typeof options.title === 'string') {
    return options.title;
  }

  return route.name;
};

const ProductDetailsTabBar = ({
  state,
  navigation,
  descriptors,
  activeColor = '#0EA5E9',
  scrollEnabled = false,
}) => {
  const visibleRoutes = state.routes.filter(route =>
    descriptors?.[route.key]?.options?.tabBarVisible !== false,
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          !scrollEnabled && styles.contentFixed,
        ]}
      >
        {visibleRoutes.map(route => {
          const selected = state.routes[state.index]?.key === route.key;
          const label = resolveTabLabel(route, descriptors);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              aria-selected={selected}
              activeOpacity={0.75}
              onPress={() => navigation.navigate(route.name)}
              style={[
                styles.tab,
                !scrollEnabled && styles.tabFixed,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  { color: selected ? activeColor : '#64748B' },
                ]}
              >
                {label}
              </Text>
              {selected ? (
                <View
                  style={[
                    styles.indicator,
                    { backgroundColor: activeColor },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default ProductDetailsTabBar;
