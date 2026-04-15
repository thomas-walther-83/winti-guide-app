import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CategoryFilter } from '../../components/CategoryFilter';
import type { ListingCategory } from '../../types';

// Mock @expo/vector-icons to avoid native module issues in tests
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: View,
  };
});

const ALL_CATEGORIES: Array<ListingCategory | 'all'> = [
  'all',
  'restaurants',
  'cafes',
  'bars',
  'hotels',
  'sightseeing',
  'kultur',
  'geschaefte',
  'sport',
  'touren',
];

describe('CategoryFilter', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <CategoryFilter selected="all" onSelect={jest.fn()} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders all 10 category chips by checking all labels exist', () => {
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={jest.fn()} />,
    );
    const expectedLabels = [
      'Alle', 'Restaurants', 'Cafés', 'Bars', 'Hotels',
      'Sightseeing', 'Kultur', 'Geschäfte', 'Sport', 'Touren',
    ];
    expectedLabels.forEach((label) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('renders the "Alle" chip label', () => {
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={jest.fn()} />,
    );
    expect(getByText('Alle')).toBeTruthy();
  });

  it('renders all category labels', () => {
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={jest.fn()} />,
    );
    expect(getByText('Restaurants')).toBeTruthy();
    expect(getByText('Cafés')).toBeTruthy();
    expect(getByText('Bars')).toBeTruthy();
    expect(getByText('Hotels')).toBeTruthy();
    expect(getByText('Sightseeing')).toBeTruthy();
    expect(getByText('Kultur')).toBeTruthy();
    expect(getByText('Geschäfte')).toBeTruthy();
    expect(getByText('Sport')).toBeTruthy();
    expect(getByText('Touren')).toBeTruthy();
  });

  it('calls onSelect with correct category when a chip is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryFilter selected="all" onSelect={onSelect} />,
    );

    fireEvent.press(getByText('Restaurants'));
    expect(onSelect).toHaveBeenCalledWith('restaurants');
  });

  it('calls onSelect with "all" when "Alle" chip is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryFilter selected="restaurants" onSelect={onSelect} />,
    );

    fireEvent.press(getByText('Alle'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('calls onSelect with correct category for each chip', () => {
    const categoryLabels: Array<{ label: string; key: ListingCategory | 'all' }> = [
      { label: 'Cafés', key: 'cafes' },
      { label: 'Bars', key: 'bars' },
      { label: 'Hotels', key: 'hotels' },
      { label: 'Sightseeing', key: 'sightseeing' },
      { label: 'Kultur', key: 'kultur' },
      { label: 'Geschäfte', key: 'geschaefte' },
      { label: 'Sport', key: 'sport' },
      { label: 'Touren', key: 'touren' },
    ];

    categoryLabels.forEach(({ label, key }) => {
      const onSelect = jest.fn();
      const { getByText } = render(
        <CategoryFilter selected="all" onSelect={onSelect} />,
      );
      fireEvent.press(getByText(label));
      expect(onSelect).toHaveBeenCalledWith(key);
    });
  });

  it('does not call onSelect when already selected chip is pressed again', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <CategoryFilter selected="restaurants" onSelect={onSelect} />,
    );

    // Pressing the already-active chip still fires the event
    fireEvent.press(getByText('Restaurants'));
    expect(onSelect).toHaveBeenCalledWith('restaurants');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
