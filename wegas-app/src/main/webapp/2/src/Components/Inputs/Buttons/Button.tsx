import * as React from 'react';
import { classNameOrEmpty, classOrNothing } from '../../../Helper/className';
import { Icons, IconComp } from '../../../Editor/Components/Views/FontAwesome';

export interface DisableBorders {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  topLeft?: boolean;
  topRight?: boolean;
  bottomLeft?: boolean;
  bottomRight?: boolean;
}

export function disableBorderToSelector(disableBorders?: DisableBorders) {
  return disableBorders != null
    ? ' disabledBorders' +
        Object.entries(disableBorders).map(
          ([border, disabled]) =>
            classOrNothing(
              'borderTopLeft',
              disabled && ['topLeft', 'left', 'top'].includes(border),
            ) +
            classOrNothing(
              'borderTopRight',
              disabled && ['topRight', 'right', 'top'].includes(border),
            ) +
            classOrNothing(
              'borderBottomLeft',
              disabled && ['bottomLeft', 'left', 'bottom'].includes(border),
            ) +
            classOrNothing(
              'borderBottomRight',
              disabled && ['bottomRight', 'right', 'bottom'].includes(border),
            ),
        )
    : '';
}

export interface ButtonProps extends ClassAndStyle {
  label?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
  tabIndex?: number;
  tooltip?: string;
  noHover?: boolean;
  type?: 'submit' | 'reset' | 'button';
  id?: string;
  customColor?: { textColor?: string; backgroundColor?: string };
  disableBorders?: DisableBorders;
  icon?: Icons;
  pressed?: boolean;
  prefixedLabel?: boolean;
  noBackground?: boolean;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.PropsWithChildren<ButtonProps>
>(
  (
    {
      label,
      onClick,
      disabled,
      noHover,
      disableBorders,
      className,
      style,
      children,
      tabIndex,
      tooltip,
      type,
      id,
      icon,
      pressed,
      prefixedLabel,
      noBackground,
    },
    ref,
  ) => {
    const computedLabel =
      icon && (label || children) ? (
        <div
          style={prefixedLabel ? { marginRight: '3px' } : { marginLeft: '3px' }}
        >
          {label}
          {children}
        </div>
      ) : (
        <>
          {label}
          {children}
        </>
      );

    return (
      <button
        ref={ref}
        id={id}
        className={
          'wegas wegas-btn ' +
          classOrNothing('disabled', disabled) +
          classOrNothing('noHover', noHover) +
          disableBorderToSelector(disableBorders) +
          classOrNothing('noClick', onClick == null) +
          classOrNothing('iconOnly', !label && !children && !noBackground) +
          classOrNothing('noBackground', noBackground) +
          classNameOrEmpty(className)
        }
        style={style}
        onClick={onClick}
        disabled={disabled}
        tabIndex={tabIndex}
        title={tooltip}
        aria-label={tooltip}
        aria-pressed={pressed}
        type={type}
      >
        {prefixedLabel && computedLabel}
        {icon && <IconComp icon={icon} />}
        {!prefixedLabel && computedLabel}
      </button>
    );
  },
);
