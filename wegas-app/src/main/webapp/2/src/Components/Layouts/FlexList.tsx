import * as React from 'react';
import { schemaProps } from '../PageComponents/tools/schemaProps';

export const alignItemsValues = [
  'stretch',
  'flex-start',
  'flex-end',
  'center',
  'baseline',
] as const;
type AlignItems = typeof alignItemsValues[number];

export const alignSelfValues = ['auto', ...alignItemsValues] as const;
type AlignSelf = typeof alignSelfValues[number];

export const flexBasisValues = [
  'auto',
  'content',
  'max-content',
  'min-content',
] as const;
type FlexBasis = typeof flexBasisValues[number] | string;

export interface FlexItemProps {
  /**
   * order - the order of the current item
   */
  order?: number;
  /**
   * alignSelf - justifies the items perpendicularly to the flex direction
   */
  alignSelf?: AlignSelf;
  /**
   * flexGrow - size factor of the item in the list
   */
  flexGrow?: number;
  /**
   * flexShrink - size factor of the item in the list
   * Important : initial value is 1
   */
  flexShrink?: number;
  /**
   * flexBasis - the initial size of the item, can be set like any css size value (%,px,em,...) or with the string "content"
   */
  flexBasis?: FlexBasis;
  /**
   * className - the class to apply to the item
   */
  className?: string;
}

export function FlexItem({
  alignSelf,
  flexGrow,
  flexShrink,
  flexBasis,
  className,
  children,
}: React.PropsWithChildren<FlexItemProps>) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        alignSelf,
        flexGrow,
        flexShrink,
        flexBasis,
      }}
    >
      {children}
    </div>
  );
}

export const flexItemSchema = {
  alignSelf: schemaProps.select('Align self', false, alignSelfValues, 'string'),
  flexGrow: schemaProps.number('Flex grow', false),
  flexShrink: schemaProps.number('Flex shrink', false),
  flexBasis: schemaProps.string('Flex basis', false),
};

export const flexDirectionValues = [
  'row',
  'row-reverse',
  'column',
  'column-reverse',
] as const;
type FlexDirection = typeof flexDirectionValues[number];

export const flexWrapValues = ['nowrap', 'wrap', 'wrap-reverse'] as const;
type FlexWrap = typeof flexWrapValues[number];

export const justifyContentValues = [
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
] as const;
type JustifyContent = typeof justifyContentValues[number];

export const alignContentValues = ['stretch', ...justifyContentValues] as const;
type AlignContent = typeof alignContentValues[number];

export interface FlexListProps {
  /**
   * flexDirection - the flex direction
   */
  flexDirection?: FlexDirection;
  /**
   * flexWrap - the wrap policy
   */
  flexWrap?: FlexWrap;
  /**
   * justifyContent - justifies the content of the list
   */
  justifyContent?: JustifyContent;
  /**
   * alignItems - justifies the items perpendicularly to the flex direction
   */
  alignItems?: AlignItems;
  /**
   * alignContent - if the list display items on multiple rows, justifies the items perpendicularly in the same way than justifyContent
   */
  alignContent?: AlignContent;
  /**
   * className - the class to apply to the list
   */
  className?: string;
  /**
   * style - the style to apply to the list (always prefer className over style to avoid messing with original behaviour of the list)
   */
  style?: React.CSSProperties;
  /**
   * children - the items in the list
   */
  children?: FlexItemProps[];
}
/**
 * Flex list.
 */
export function FlexList({
  flexDirection,
  flexWrap,
  justifyContent,
  alignItems,
  alignContent,
  className,
  style,
  children,
}: React.PropsWithChildren<FlexListProps>) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection,
        flexWrap,
        justifyContent,
        alignItems,
        alignContent,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
