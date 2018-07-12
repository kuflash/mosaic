import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { McLayoutModule } from '../../lib/layout';


@Component({
    selector: 'app',
    template: require('./template.html'),
    styleUrls: ['./styles.scss']
})
export class DemoComponent {}


@NgModule({
    declarations: [
        DemoComponent
    ],
    imports: [
        BrowserModule,
        McLayoutModule
    ],
    bootstrap: [
        DemoComponent
    ]
})
export class DemoModule {}

platformBrowserDynamic()
    .bootstrapModule(DemoModule)
    .catch((error) => console.error(error));

