import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from '../../components/SearchBar';

// Mock @expo/vector-icons to avoid native module issues in tests
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: View,
  };
});

describe('SearchBar', () => {
  it('renders without crashing', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(getByPlaceholderText('Suchen...')).toBeTruthy();
  });

  it('uses custom placeholder when provided', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search here..." />,
    );
    expect(getByPlaceholderText('Search here...')).toBeTruthy();
  });

  it('falls back to default placeholder when none provided', () => {
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(getByPlaceholderText('Suchen...')).toBeTruthy();
  });

  it('displays the current value', () => {
    const { getByDisplayValue } = render(
      <SearchBar value="pizza" onChangeText={jest.fn()} />,
    );
    expect(getByDisplayValue('pizza')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="" onChangeText={onChangeText} />,
    );

    fireEvent.changeText(getByPlaceholderText('Suchen...'), 'restaurant');
    expect(onChangeText).toHaveBeenCalledWith('restaurant');
  });

  it('shows clear button when value is non-empty', () => {
    const { getByTestId, UNSAFE_queryAllByType } = render(
      <SearchBar value="test" onChangeText={jest.fn()} />,
    );
    // The clear button (TouchableOpacity) is rendered when value.length > 0
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_queryAllByType(TouchableOpacity);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('does not show clear button when value is empty', () => {
    const { UNSAFE_queryAllByType } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_queryAllByType(TouchableOpacity);
    expect(buttons.length).toBe(0);
  });

  it('clears the text when clear button is pressed', () => {
    const onChangeText = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <SearchBar value="some text" onChangeText={onChangeText} />,
    );
    const { TouchableOpacity } = require('react-native');
    const clearButton = UNSAFE_getAllByType(TouchableOpacity)[0];

    fireEvent.press(clearButton);
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
