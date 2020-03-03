import * as React from 'react';
import { css, cx } from 'emotion';
import { CSSProperties } from 'react';
import { themeVar } from '../../Theme';

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

export const disableBordersCSS = (
  disableBorders?: DisableBorders,
): CSSProperties => ({
  borderTopLeftRadius:
    disableBorders &&
    (disableBorders.topLeft || disableBorders.left || disableBorders.top)
      ? undefined
      : themeVar.borderRadius,
  borderTopRightRadius:
    disableBorders &&
    (disableBorders.topRight || disableBorders.right || disableBorders.top)
      ? undefined
      : themeVar.borderRadius,
  borderBottomLeftRadius:
    disableBorders &&
    (disableBorders.bottomLeft || disableBorders.left || disableBorders.bottom)
      ? undefined
      : themeVar.borderRadius,
  borderBottomRightRadius:
    disableBorders &&
    (disableBorders.bottomRight ||
      disableBorders.right ||
      disableBorders.bottom)
      ? undefined
      : themeVar.borderRadius,
});

const buttonStyle = (
  disabled?: boolean,
  noHover?: boolean,
  disableBorders?: DisableBorders,
) =>
  css({
    backgroundColor: disabled
      ? themeVar.disabledColor
      : themeVar.primaryDarkerColor,
    color: themeVar.primaryLighterTextColor,
    borderStyle: 'none',
    ...disableBordersCSS(disableBorders),
    paddingLeft: '5px',
    paddingRight: '5px',
    paddingTop: '2px',
    paddingBottom: '2px',
    cursor: disabled ? 'default' : 'pointer',
    ':hover':
      disabled || noHover
        ? undefined
        : {
            backgroundColor: themeVar.primaryLighterColor,
            outline: 'none',
          },
  });

export interface CommonButtonProps {
  label?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  disabled?: boolean;
  tabIndex?: number;
  tooltip?: string;
  noHover?: boolean;
  type?: 'submit' | 'reset' | 'button';
  className?: string;
  id?: string;
}

export interface ButtonProps extends CommonButtonProps {
  disableBorders?: DisableBorders;
}

export function Button({
  label,
  onClick,
  disabled,
  noHover,
  disableBorders,
  className,
  children,
  tabIndex,
  tooltip,
  type,
  id,
}: React.PropsWithChildren<ButtonProps>) {
  return (
    <button
      id={id}
      className={cx(buttonStyle(disabled, noHover, disableBorders), className)}
      onClick={onClick}
      disabled={disabled}
      tabIndex={tabIndex}
      title={tooltip}
      type={type}
    >
      <>
        {label}
        {children}
      </>
    </button>
  );
}
