import { FASTElement, observable } from "@microsoft/fast-element";
import { inRange, invert } from "lodash-es";
import {
    isHTMLElement,
    keyCodeArrowDown,
    keyCodeArrowUp,
    keyCodeEnd,
    keyCodeHome,
} from "@microsoft/fast-web-utilities";
import { MenuItem, MenuItemRole } from "../menu-item/index";

/**
 * A Menu Custom HTML Element.
 * Implements the {@link https://www.w3.org/TR/wai-aria-1.1/#menu | ARIA menu }.
 *
 * @public
 */
export class Menu extends FASTElement {
    /**
     * @internal
     */
    @observable
    public items: HTMLSlotElement;
    private itemsChanged(oldValue, newValue): void {
        if (this.$fastController.isConnected) {
            this.menuItems = this.domChildren();
            this.resetItems(oldValue);
            this.setItems();
        }
    }

    private menuItems: Element[];

    private expandedItem: MenuItem | null = null;

    /**
     * The index of the focusable element in the items array
     * defaults to -1
     */
    private focusIndex: number = -1;

    private static focusableElementRoles: { [key: string]: string } = invert(
        MenuItemRole
    );

    /**
     * @internal
     */
    public connectedCallback(): void {
        super.connectedCallback();
        this.menuItems = this.domChildren();
    }

    /**
     * Focuses the first item in the menu.
     *
     * @public
     */
    public focus(): void {
        this.setFocus(0, 1);
    }

    /**
     * Collapses any expanded menu items.
     *
     * @public
     */
    public collapseExpandedMenus(): void {
        if (this.expandedItem !== null) {
            this.expandedItem.expanded = false;
            this.expandedItem = null;
        }
    }

    /**
     * @internal
     */
    public disconnectedCallback(): void {
        super.disconnectedCallback();
        this.menuItems = [];
    }

    /**
     * @internal
     */
    public handleMenuKeyDown(e: KeyboardEvent): void | boolean {
        if (e.defaultPrevented) {
            return;
        }
        switch (e.keyCode) {
            case keyCodeArrowDown:
                // go forward one index
                this.setFocus(this.focusIndex + 1, 1);
                return;
            case keyCodeArrowUp:
                // go back one index
                this.setFocus(this.focusIndex - 1, -1);
                return;
            case keyCodeEnd:
                // set focus on last item
                this.setFocus(this.menuItems.length - 1, -1);
                return;
            case keyCodeHome:
                // set focus on first item
                this.setFocus(0, 1);
                return;

            default:
                // if we are not handling the event, do not prevent default
                return true;
        }
    }

    /**
     * if focus is moving out of the menu, reset to a stable initial state
     * @internal
     */
    public handleFocusOut = (e: FocusEvent) => {
        if (!this.contains(e.relatedTarget as Element)) {
            this.collapseExpandedMenus();

            // find our first focusable element
            const focusIndex: number = this.menuItems.findIndex(this.isFocusableElement);

            // set the current focus index's tabindex to -1
            this.menuItems[this.focusIndex].setAttribute("tabindex", "-1");

            // set the first focusable element tabindex to 0
            this.menuItems[focusIndex].setAttribute("tabindex", "0");

            // set the focus index
            this.focusIndex = focusIndex;
        }
    };

    private handleExpandedChanged = (e: Event): void => {
        if (
            e.defaultPrevented ||
            e.target === null ||
            this.menuItems.indexOf(e.target as Element) < 0
        ) {
            return;
        }

        e.preventDefault();
        const changedItem: MenuItem = (e.target as any) as MenuItem;

        // closing an expanded item without opening another
        if (
            this.expandedItem !== null &&
            changedItem === this.expandedItem &&
            changedItem.expanded === false
        ) {
            this.expandedItem = null;
            return;
        }

        if (changedItem.expanded) {
            if (this.expandedItem !== null && this.expandedItem !== changedItem) {
                this.expandedItem.expanded = false;
            }
            this.expandedItem = changedItem;
        }
    };

    private setItems = (): void => {
        const focusIndex = this.menuItems.findIndex(this.isFocusableElement);

        // if our focus index is not -1 we have items
        if (focusIndex !== -1) {
            this.focusIndex = focusIndex;
        }

        for (let item: number = 0; item < this.menuItems.length; item++) {
            this.menuItems[item].setAttribute(
                "tabindex",
                item === focusIndex ? "0" : "-1"
            );
            this.menuItems[item].addEventListener(
                "expanded-change",
                this.handleExpandedChanged
            );
        }
    };

    private resetItems = (oldValue: any): void => {
        for (let item: number = 0; item < oldValue.length; item++) {
            oldValue[item].removeEventListener(
                "expanded-change",
                this.handleExpandedChanged
            );
        }
    };

    /**
     * get an array of valid DOM children
     */
    private domChildren(): Element[] {
        const results: Element[] = Array.from(this.children);
        return results;
    }

    /**
     * check if the item is a menu item
     */
    private isMenuItemElement = (el: Element): el is HTMLElement => {
        return (
            isHTMLElement(el) &&
            Menu.focusableElementRoles.hasOwnProperty(el.getAttribute("role") as string)
        );
    };

    /**
     * check if the item is focusable
     */
    private isFocusableElement = (el: Element): el is HTMLElement => {
        return this.isMenuItemElement(el);
    };

    // private handleMenuItemBlur = (e: FocusEvent): void => {
    //     const target = e.currentTarget as Element;
    //     const focusIndex: number = this.menuItems.indexOf(target);

    //     if (this.isDisabledElement(target)) {
    //         target.blur();
    //         return;
    //     }

    //     if (focusIndex !== this.focusIndex && focusIndex !== -1) {
    //         this.setFocus(focusIndex, focusIndex > this.focusIndex ? 1 : -1);
    //     }
    // };

    private setFocus(focusIndex: number, adjustment: number): void {
        const children: Element[] = this.menuItems;

        while (inRange(focusIndex, children.length)) {
            const child: Element = children[focusIndex];

            if (this.isFocusableElement(child)) {
                // change the previous index to -1
                children[this.focusIndex].setAttribute("tabindex", "-1");

                // update the focus index
                this.focusIndex = focusIndex;

                // update the tabindex of next focusable element
                child.setAttribute("tabindex", "0");

                // focus the element
                child.focus();

                break;
            }

            focusIndex += adjustment;
        }
    }
}
