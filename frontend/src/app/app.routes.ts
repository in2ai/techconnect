import { Routes } from '@angular/router';
import { authChildGuard, authGuard, anonymousOnlyGuard } from '@core/guards/auth.guard';
import { AppShellComponent } from '@shared/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [anonymousOnlyGuard],
    loadComponent: () => import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/pages/patient-list/patient-list.page').then(
            (m) => m.PatientListPage,
          ),
      },
      {
        path: 'patients/:nhc',
        loadComponent: () =>
          import('./features/patients/pages/patient-detail/patient-detail.page').then(
            (m) => m.PatientDetailPage,
          ),
      },
      {
        path: 'tumors',
        loadComponent: () =>
          import('./features/tumors/pages/tumor-list/tumor-list.page').then((m) => m.TumorListPage),
      },
      {
        path: 'tumors/:biobank_code',
        loadComponent: () =>
          import('./features/tumors/pages/tumor-detail/tumor-detail.page').then(
            (m) => m.TumorDetailPage,
          ),
      },
      {
        path: 'biomodels',
        loadComponent: () =>
          import('./features/biomodels/pages/biomodel-list/biomodel-list.page').then(
            (m) => m.BiomodelListPage,
          ),
      },
      {
        path: 'biomodels/:id',
        loadComponent: () =>
          import('./features/biomodels/pages/biomodel-detail/biomodel-detail.page').then(
            (m) => m.BiomodelDetailPage,
          ),
      },
      {
        path: 'passages',
        loadComponent: () =>
          import('./features/passages/pages/passage-list/passage-list.page').then(
            (m) => m.PassageListPage,
          ),
      },
      {
        path: 'passages/:id',
        loadComponent: () =>
          import('./features/passages/pages/passage-detail/passage-detail.page').then(
            (m) => m.PassageDetailPage,
          ),
      },
      {
        path: 'samples',
        loadComponent: () =>
          import('./features/samples/pages/sample-list/sample-list.page').then(
            (m) => m.SampleListPage,
          ),
      },
      {
        path: 'samples/:id',
        loadComponent: () =>
          import('./features/samples/pages/sample-detail/sample-detail.page').then(
            (m) => m.SampleDetailPage,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
