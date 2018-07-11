import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { McContentComponent } from './content.component';
import { McFooterComponent } from './footer.component';
import { McHeaderComponent } from './header.component';
import { McLayoutComponent } from './layout.component';


@NgModule({
    imports: [ CommonModule ],
    exports: [
        McLayoutComponent,
        McContentComponent,
        McFooterComponent,
        McHeaderComponent
    ],
    declarations: [
        McLayoutComponent,
        McContentComponent,
        McFooterComponent,
        McHeaderComponent
    ]
})
export class McLayoutModule {
}
