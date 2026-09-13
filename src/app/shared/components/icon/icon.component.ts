import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, input } from '@angular/core';
import {
  LucideArrowRight,
  LucideBanknote,
  LucideBriefcaseBusiness,
  LucideCalculator,
  LucideCalendarDays,
  LucideCarFront,
  LucideCheck,
  LucideChevronRight,
  LucideClock3,
  LucideCopy,
  LucideFileText,
  LucideGift,
  LucideHeart,
  LucideHouse,
  LucideInfo,
  LucideMaximize2,
  LucideMenu,
  LucideMinus,
  LucideMoon,
  LucidePawPrint,
  LucidePlus,
  LucideReceiptText,
  LucideRefreshCw,
  LucideShare2,
  LucideShieldCheck,
  LucideShoppingCart,
  LucideSparkles,
  LucideStethoscope,
  LucideStore,
  LucideSun,
  LucideTicket,
  LucideTrash2,
  LucideTrophy,
  LucideWalletCards,
  LucideX,
} from '@lucide/angular';

export type IconName =
  | 'arrow'
  | 'briefcase'
  | 'calculator'
  | 'calendar'
  | 'cart'
  | 'car'
  | 'check'
  | 'chevron'
  | 'clock'
  | 'copy'
  | 'document'
  | 'expand'
  | 'gift'
  | 'heart'
  | 'home'
  | 'info'
  | 'menu'
  | 'minus'
  | 'money'
  | 'moon'
  | 'paw'
  | 'receipt'
  | 'refresh'
  | 'trash'
  | 'shield'
  | 'share'
  | 'shop'
  | 'spark'
  | 'stethoscope'
  | 'sun'
  | 'ticket'
  | 'wallet'
  | 'trophy'
  | 'plus'
  | 'x';

@Component({
  selector: 'app-icon',
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="icons[name()]" />`,
  styles: `
    :host ::ng-deep svg {
      display: block;
      width: 100%;
      height: 100%;
      stroke-width: 1.8;
    }
  `,
  host: { class: 'inline-block size-6 shrink-0', 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();

  protected readonly icons: Readonly<Record<IconName, Type<unknown>>> = {
    arrow: LucideArrowRight,
    briefcase: LucideBriefcaseBusiness,
    calculator: LucideCalculator,
    calendar: LucideCalendarDays,
    cart: LucideShoppingCart,
    car: LucideCarFront,
    check: LucideCheck,
    chevron: LucideChevronRight,
    clock: LucideClock3,
    copy: LucideCopy,
    document: LucideFileText,
    expand: LucideMaximize2,
    gift: LucideGift,
    heart: LucideHeart,
    home: LucideHouse,
    info: LucideInfo,
    menu: LucideMenu,
    minus: LucideMinus,
    money: LucideBanknote,
    moon: LucideMoon,
    paw: LucidePawPrint,
    receipt: LucideReceiptText,
    refresh: LucideRefreshCw,
    trash: LucideTrash2,
    shield: LucideShieldCheck,
    share: LucideShare2,
    shop: LucideStore,
    spark: LucideSparkles,
    stethoscope: LucideStethoscope,
    sun: LucideSun,
    ticket: LucideTicket,
    wallet: LucideWalletCards,
    trophy: LucideTrophy,
    plus: LucidePlus,
    x: LucideX,
  };
}
