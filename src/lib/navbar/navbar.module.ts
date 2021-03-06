import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { A11yModule } from '@ptsecurity/cdk/a11y';
import { PlatformModule } from '@ptsecurity/cdk/platform';

import {
    McNavbar,
    McNavbarContainer,
    McNavbarItem,
    McNavbarTitle,
    McNavbarBrand,
    McNavbarLogo
} from './navbar.component';


@NgModule({
    imports: [
        CommonModule,
        A11yModule,
        PlatformModule
    ],
    exports: [
        McNavbar,
        McNavbarContainer,
        McNavbarTitle,
        McNavbarItem,
        McNavbarBrand,
        McNavbarLogo
    ],
    declarations: [
        McNavbar,
        McNavbarContainer,
        McNavbarTitle,
        McNavbarItem,
        McNavbarBrand,
        McNavbarLogo
    ]
})
export class McNavbarModule {}
