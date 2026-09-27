import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { adminErrorMessage } from '../core/admin-domain-error';
import { AdminFeedback, AdminFeedbackKind, AdminFeedbackService } from '../core/admin-feedback';
import { AdminApiService } from '../core/admin-api.service';
import {
  AdminProductDetail,
  AdminProductMedia,
  AdminProductVariant,
  CreateAdminProductMediaRequest,
  CreateAdminProductRequest,
  CreateAdminVariantRequest,
  UpdateAdminProductMediaRequest,
  UpdateAdminProductRequest,
  UpdateAdminVariantRequest,
} from '../core/admin.models';
import { formatArsFromCents } from '../core/admin-formatters';
import { RescueImage } from '../../core/models/rescue-image.model';
import { PhotoSwipeService } from '../../core/services/photo-swipe.service';

interface ProductForm {
  name: string;
  slug: string;
  shortDescription: string;
  featured: boolean;
  sortOrder: number;
  active: boolean;
}

interface VariantForm {
  model: string;
  id: string | null;
  sku: string;
  name: string;
  color: string;
  size: string;
  price: string;
  active: boolean;
  sortOrder: number;
  lowStockThreshold: number | null;
  initialStock: number;
}

interface MediaForm {
  id: string | null;
  variantId?: string | null;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
}

interface DeletionTarget {
  kind: 'product' | 'variant';
  id: string;
  name: string;
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page product-editor">
      <nav class="breadcrumb">
        <a routerLink="/admin/products">Productos</a>
        <span>/</span>
        <span>{{ id ? model.name || 'Editar producto' : 'Nuevo producto' }}</span>
      </nav>

      <header class="page-heading">
        <div>
          <p class="eyebrow">Catálogo</p>
          <h1>{{ id ? 'Editar producto' : 'Nuevo producto' }}</h1>
          <p class="page-description">
            {{
              id
                ? model.name
                : 'Creá la información base antes de administrar variantes e imágenes.'
            }}
          </p>
        </div>
        <span class="status-mark self-start" [class.is-muted]="!model.active">
          {{ model.active ? 'Activo' : 'Inactivo' }}
        </span>
      </header>

      @if (notice()) {
        <p class="feedback" [class]="'feedback ' + notice()!.kind" aria-live="polite">
          {{ notice()!.message }}
        </p>
      }

      <form #form="ngForm" class="editor" (ngSubmit)="saveProduct()">
        <section class="editor-section">
          <div class="section-heading">
            <h2>Información</h2>
            <p>Datos visibles del producto en el catálogo.</p>
          </div>
          <div class="form-grid">
            <label>Nombre<input name="name" required [(ngModel)]="model.name" (ngModelChange)="markDirty()" /></label>
            <label>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" [(ngModel)]="model.slug" (ngModelChange)="markDirty()" /></label>
            <label class="wide">Descripción corta<textarea name="description" [(ngModel)]="model.shortDescription" (ngModelChange)="markDirty()"></textarea></label>
            <label>Orden<input name="sortOrder" type="number" [(ngModel)]="model.sortOrder" (ngModelChange)="markDirty()" /></label>
            <div class="toggle-row">
              <label class="check"><input name="featured" type="checkbox" [(ngModel)]="model.featured" (ngModelChange)="markDirty()" /> Destacado</label>
              <label class="check"><input name="active" type="checkbox" [(ngModel)]="model.active" (ngModelChange)="markDirty()" /> Activo</label>
            </div>
          </div>
          <div class="section-actions">
            <button class="button button-primary" [disabled]="form.invalid || saving() || initialMediaInvalid()">
              {{ saving() ? 'Guardando...' : 'Guardar información' }}
            </button>
          </div>
        </section>

        @if (!id) {
          <section class="editor-section">
            <div class="section-heading">
              <h2>Imagen inicial</h2>
              <p>Opcional. Se agrega al producto apenas se crea.</p>
            </div>
            <div class="media-form">
              <div class="form-grid">
                <label class="wide">
                  URL
                  <input
                    name="initialMediaUrl"
                    type="url"
                    [ngModel]="initialMedia().url"
                    (ngModelChange)="updateInitialMedia('url', $event)"
                    placeholder="https://res.cloudinary.com/.../producto.jpg"
                  />
                </label>
                <label class="wide">
                  Descripción de la imagen
                  <input
                    name="initialMediaDescription"
                    [ngModel]="initialMedia().alt"
                    (ngModelChange)="updateInitialMedia('alt', $event)"
                    placeholder="Taza Gatarsis color lila con logo blanco"
                  />
                  <small>Describe brevemente lo que aparece en la foto. Se usa para accesibilidad si la imagen no puede verse.</small>
                </label>
                <label>
                  Orden
                  <input
                    name="initialMediaSortOrder"
                    type="number"
                    [ngModel]="initialMedia().sortOrder"
                    (ngModelChange)="updateInitialMedia('sortOrder', $event)"
                  />
                </label>
                <label class="check align-end">
                  <input
                    name="initialMediaCover"
                    type="checkbox"
                    [ngModel]="initialMedia().isCover"
                    (ngModelChange)="updateInitialMedia('isCover', $event)"
                  />
                  Usar como portada
                </label>
              </div>
              <div class="media-preview draft">
                @if (initialMedia().url) {
                  <img
                    [src]="initialMedia().url"
                    [alt]="initialMedia().alt || 'Vista previa de imagen'"
                    (error)="initialImageFailed.set(true)"
                  />
                }
                @if (initialImageFailed()) {
                  <span>No se pudo cargar la imagen.</span>
                } @else if (!initialMedia().url) {
                  <span>Vista previa</span>
                }
              </div>
            </div>
            @if (initialMediaError() || initialMediaValidationMessage()) {
              <p class="feedback error" aria-live="polite">
                {{ initialMediaError() || initialMediaValidationMessage() }}
              </p>
            }
          </section>
        }
      </form>

      @if (id) {
        <section class="editor-section">
          <div class="section-heading inline-heading">
            <div>
              <h2>Variantes</h2>
              <p>SKU, precio y atributos de venta.</p>
            </div>
            <div class="actions">
              <button type="button" class="button button-secondary" (click)="newVariant()">Agregar variante</button>
              <button type="button" class="button button-primary" (click)="openVariantGenerator()">Generar variantes</button>
            </div>
          </div>
          @if (product()?.variants?.length) {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Variante</th>
                    <th>SKU</th>
                    <th>Precio</th>
                    <th>Color / Talle</th>
                    <th>Stock mínimo</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of product()!.variants; track item.id) {
                    <tr>
                      <td>
                        <div class="media-preview thumb">
                          @if (variantPreview(item); as preview) {
                            <img [src]="preview.url" [alt]="preview.alt" (error)="markImageFailed(preview.id)" />
                          } @else {
                            <span>Sin foto</span>
                          }
                        </div>
                      </td>
                      <td>{{ item.name }}</td>
                      <td><code>{{ item.sku }}</code></td>
                      <td>{{ ars(item.priceInCents) }}</td>
                      <td>
                        {{ variantDimensions(item) }}
                        @if (hasLegacyMultipleSizes(item)) {
                          <p class="muted">
                            <span>Esta variante contiene varios talles en un único registro.</span>
                            <button type="button" (click)="openVariantGenerator(item)">Recrear correctamente</button>
                          </p>
                        }
                      </td>
                      <td>{{ item.lowStockThreshold ?? '—' }}</td>
                      <td>{{ item.active ? 'Activa' : 'Inactiva' }}</td>
                      <td class="table-actions">
                        <button type="button" class="action-button" (click)="editVariant(item)">Editar</button>
                        <button
                          type="button"
                          class="danger-action"
                          [attr.aria-label]="'Eliminar variante ' + item.name"
                          (click)="requestVariantDeletion(item)"
                        >Eliminar</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty compact">Todavía no hay variantes.</p>
          }
        </section>

        <section class="editor-section">
          <div class="section-heading inline-heading">
            <div>
              <h2>Imágenes del producto</h2>
              <p>Se muestran como galería general y sirven de respaldo para variantes sin imágenes propias.</p>
            </div>
            <button type="button" class="button button-secondary" (click)="newMedia()">Agregar imagen</button>
          </div>
          @if (generalMedia().length) {
            <div class="media-grid">
              @for (item of generalMedia(); track item.id; let index = $index) {
                <article class="media-card">
                  <button
                    type="button"
                    class="media-preview"
                    style="border: 0; padding: 0; cursor: pointer"
                    (click)="openMediaViewer(generalMedia(), index)"
                    [attr.aria-label]="'Abrir ' + item.alt + ' en tamaño completo'"
                  >
                    @if (failedImages().has(item.id)) {
                      <span>No se pudo cargar la imagen.</span>
                    } @else {
                      <img [src]="item.url" [alt]="item.alt" (error)="markImageFailed(item.id)" />
                    }
                  </button>
                  <div class="media-copy">
                    <strong>{{ item.alt }}</strong>
                    <span>Orden {{ item.sortOrder }}</span>
                    @if (item.isCover) {
                      <span class="cover-label">Portada del producto</span>
                    }
                  </div>
                  <div class="media-actions">
                    <button type="button" (click)="editMedia(item)">Editar</button>
                    <button type="button" class="danger-action" (click)="deleteMedia(item)">Eliminar</button>
                  </div>
                </article>
              }
            </div>
          } @else {
            <p class="empty compact">Todavía no hay imágenes.</p>
          }
        </section>

        <section class="editor-section danger-zone">
          <div class="section-heading">
            <h2>Zona de peligro</h2>
            <p>El producto dejará de estar disponible en la tienda.</p>
          </div>
          <div class="section-heading inline-heading">
            <p>Si nunca tuvo actividad se eliminará definitivamente. Si tiene historial, se archivará para conservar los registros.</p>
            <button type="button" class="button button-danger" (click)="requestProductDeletion()">Eliminar producto</button>
          </div>
        </section>
      }

      @if (variant()) {
        <div class="dialog-backdrop">
          <form class="dialog wide-dialog" (ngSubmit)="saveVariant()">
            <header>
              <h2>{{ variant()!.id ? 'Editar variante' : 'Nueva variante' }}</h2>
              <button type="button" class="close-button" (click)="variant.set(null)" aria-label="Cerrar">×</button>
            </header>
            <div class="form-grid">
              <label>Nombre<input [(ngModel)]="variant()!.name" name="variantName" required /></label>
              <label>SKU<input [(ngModel)]="variant()!.sku" name="sku" required /></label>
              <label>Precio (ARS)<input [(ngModel)]="variant()!.price" name="variantPrice" inputmode="decimal" required /></label>
              @if (!variant()!.id) {
                <label>
                  Stock inicial
                  <input [(ngModel)]="variant()!.initialStock" name="initialStock" type="number" min="0" step="1" required />
                  <small>Cantidad disponible al crear la variante.</small>
                </label>
              }
              <label>
                Stock mínimo
                <input [(ngModel)]="variant()!.lowStockThreshold" name="lowStockThreshold" type="number" min="0" />
                <small>Cuando el stock disponible llegue a este valor se considera bajo.</small>
              </label>
              <label>Modelo<input [(ngModel)]="variant()!.model" name="variantModel" maxlength="120" /></label>
              <label>Color<input [(ngModel)]="variant()!.color" name="color" /></label>
              <label>
                Talle
                <input [(ngModel)]="variant()!.size" name="size" />
                <small>Un solo talle por variante.</small>
              </label>
              <label>Orden<input [(ngModel)]="variant()!.sortOrder" name="variantSortOrder" type="number" /></label>
              <label class="check align-end"><input [(ngModel)]="variant()!.active" name="variantActive" type="checkbox" /> Activa</label>
            </div>
            @if (variant()!.id) {
              <section class="variant-media-panel">
                <div class="section-heading inline-heading">
                  <div>
                    <h3>Imágenes de esta variante</h3>
                    <p>Usalas cuando la variante cambia visualmente el producto.</p>
                  </div>
                  <button type="button" class="button button-secondary" (click)="newMedia(variant()!.id!)">Agregar imagen</button>
                </div>
                @if (variantMedia(variant()!.id!).length) {
                  <div class="media-grid compact">
                    @for (item of variantMedia(variant()!.id!); track item.id; let index = $index) {
                      <article class="media-card">
                        <button
                          type="button"
                          class="media-preview"
                          style="border: 0; padding: 0; cursor: pointer"
                          (click)="openMediaViewer(variantMedia(variant()!.id!), index)"
                          [attr.aria-label]="'Abrir ' + item.alt + ' en tamaño completo'"
                        >
                          @if (failedImages().has(item.id)) {
                            <span>No se pudo cargar la imagen.</span>
                          } @else {
                            <img [src]="item.url" [alt]="item.alt" (error)="markImageFailed(item.id)" />
                          }
                        </button>
                        <div class="media-copy">
                          <strong>{{ item.alt }}</strong>
                          <span>Orden {{ item.sortOrder }}</span>
                          @if (item.isCover) {
                            <span class="cover-label">Portada de esta variante</span>
                          }
                        </div>
                        <div class="media-actions">
                          <button type="button" (click)="editMedia(item)">Editar</button>
                          <button type="button" class="danger-action" (click)="deleteMedia(item)">Eliminar</button>
                        </div>
                      </article>
                    }
                  </div>
                } @else {
                  <p class="empty compact">Esta variante todavía no tiene imágenes propias.</p>
                }
              </section>
            }
            <div class="actions">
              <button type="button" class="button button-quiet" (click)="variant.set(null)">Cancelar</button>
              <button class="button button-primary">Guardar variante</button>
            </div>
          </form>
        </div>
      }

      @if (variantGenerator()) {
        <div class="dialog-backdrop">
          <section class="dialog generator-dialog" aria-labelledby="variant-generator-title">
            <header>
              <div>
                <h2 id="variant-generator-title">Generar variantes</h2>
                <p>Creá combinaciones reales. Cada una tendrá SKU, precio y stock propios.</p>
              </div>
              <button type="button" class="close-button" (click)="closeVariantGenerator()" aria-label="Cerrar">×</button>
            </header>

            <div class="generator-controls">
              <p>Usá sólo las opciones que correspondan al producto. Un llavero puede tener sólo modelos; una remera puede combinar modelo y talle.</p>
              <fieldset>
                <legend>Modelos</legend>
                <div class="chip-list">
                  @for (model of variantGenerator()!.models; track model) {
                    <button type="button" class="button button-secondary" (click)="removeGeneratorModel(model)">{{ model }} <span aria-hidden="true">×</span></button>
                  }
                </div>
                <div class="add-attribute">
                  <input [ngModel]="variantGenerator()!.modelInput" (ngModelChange)="updateVariantGenerator('modelInput', $event)" name="generatorModel" placeholder="Otro modelo..." aria-label="Nuevo modelo" maxlength="120" (keydown.enter)="$event.preventDefault(); addGeneratorModel()" />
                  <button type="button" class="button button-secondary" (click)="addGeneratorModel()">Agregar modelo</button>
                </div>
              </fieldset>
              <fieldset>
                <legend>Colores</legend>
                @if (variantGenerator()!.colors.length) {
                  <div class="chip-list">
                    @for (color of variantGenerator()!.colors; track color) {
                      <button type="button" class="button button-secondary" (click)="removeGeneratorColor(color)">{{ color }} <span aria-hidden="true">×</span></button>
                    }
                  </div>
                }
                <div class="add-attribute">
                  <input
                    [ngModel]="variantGenerator()!.colorInput"
                    (ngModelChange)="updateVariantGenerator('colorInput', $event)"
                    name="generatorColor"
                    placeholder="Blanco"
                    (keydown.enter)="$event.preventDefault(); addGeneratorColor()"
                  />
                  <button type="button" class="button button-secondary" (click)="addGeneratorColor()">Agregar color</button>
                </div>
              </fieldset>

              <fieldset>
                <legend>Talles</legend>
                <div class="size-options">
                  @for (size of commonSizes; track size) {
                    <button
                      type="button"
                      class="button button-secondary size-option"
                      [class.is-selected]="variantGenerator()!.sizes.includes(size)"
                      (click)="toggleGeneratorSize(size)"
                    >{{ size }}</button>
                  }
                </div>
                @if (customGeneratorSizes().length) {
                  <div class="chip-list">
                    @for (size of customGeneratorSizes(); track size) {
                      <button type="button" class="button button-secondary" (click)="removeGeneratorSize(size)">{{ size }} <span aria-hidden="true">×</span></button>
                    }
                  </div>
                }
                <div class="add-attribute">
                  <input
                    [ngModel]="variantGenerator()!.customSize"
                    (ngModelChange)="updateVariantGenerator('customSize', $event)"
                    name="generatorCustomSize"
                    placeholder="Otro talle"
                    (keydown.enter)="$event.preventDefault(); addCustomGeneratorSize()"
                  />
                  <button type="button" class="button button-secondary" (click)="addCustomGeneratorSize()">Otro talle</button>
                </div>
              </fieldset>

              <div class="form-grid">
                <label>Precio base (ARS)<input [ngModel]="variantGenerator()!.price" (ngModelChange)="updateVariantGenerator('price', $event)" name="generatorPrice" inputmode="decimal" /></label>
                <label>Prefijo SKU<input [ngModel]="variantGenerator()!.skuPrefix" (ngModelChange)="updateVariantGenerator('skuPrefix', $event)" name="generatorPrefix" placeholder="REM-GAT" /></label>
                <label>Orden inicial<input [ngModel]="variantGenerator()!.sortOrder" (ngModelChange)="updateVariantGenerator('sortOrder', $event)" name="generatorSortOrder" type="number" /></label>
                <label>Stock inicial<input [ngModel]="variantGenerator()!.initialStock" (ngModelChange)="updateVariantGenerator('initialStock', $event)" name="generatorInitialStock" type="number" min="0" step="1" /></label>
                <label class="check align-end"><input [ngModel]="variantGenerator()!.active" (ngModelChange)="updateVariantGenerator('active', $event)" name="generatorActive" type="checkbox" /> Activas</label>
              </div>
            </div>

            <section class="generator-preview">
              <div class="section-heading inline-heading">
                <div>
                  <h3>Vista previa</h3>
                  <p>{{ creatableGeneratedVariants().length }} combinaciones listas para crear.</p>
                </div>
                <button type="button" class="button button-secondary" (click)="refreshGeneratedVariants()">Actualizar vista previa</button>
              </div>
              @if (generatedVariants().length) {
                <div class="table-wrap">
                  <table>
                    <thead><tr><th>Combinación</th><th>Nombre</th><th>SKU</th><th>Precio</th><th>Stock inicial</th><th>Activa</th><th>Estado</th></tr></thead>
                    <tbody>
                      @for (draft of generatedVariants(); track $index; let index = $index) {
                        <tr [class.row-muted]="draft.exists">
                          <td>{{ generatedDimensions(draft) }}</td>
                          <td><input [ngModel]="draft.name" (ngModelChange)="updateGeneratedVariant(index, 'name', $event)" [name]="'generatedName' + index" /></td>
                          <td><input [ngModel]="draft.sku" (ngModelChange)="updateGeneratedVariant(index, 'sku', $event)" [name]="'generatedSku' + index" /></td>
                          <td><input [ngModel]="draft.price" (ngModelChange)="updateGeneratedVariant(index, 'price', $event)" [name]="'generatedPrice' + index" inputmode="decimal" /></td>
                          <td><input [ngModel]="draft.initialStock" (ngModelChange)="updateGeneratedVariant(index, 'initialStock', $event)" [name]="'generatedStock' + index" type="number" min="0" step="1" /></td>
                          <td><input [ngModel]="draft.active" (ngModelChange)="updateGeneratedVariant(index, 'active', $event)" [name]="'generatedActive' + index" type="checkbox" /></td>
                          <td>
                            @if (draft.exists) { <span class="status-mark is-muted">Ya existe</span> }
                            @else if (draft.error) { <span class="status-mark status-requires_review">{{ draft.error }}</span> }
                            @else { <span class="status-mark">Lista</span> }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              } @else {
                <p class="empty compact">Elegí al menos un modelo, color o talle para generar variantes.</p>
              }
            </section>

            @if (generationResult()) {
              <p class="feedback" [class]="generationHasFailures() ? 'feedback error' : 'feedback success'" aria-live="polite">{{ generationResult() }}</p>
            }
            <p class="generator-stock-note">Podés definir el stock inicial de cada combinación. Al recrear datos históricos empieza en 0: nunca repartimos stock automáticamente.</p>
            <div class="actions">
              <button type="button" class="button button-quiet" (click)="closeVariantGenerator()">Cancelar</button>
              <button type="button" class="button button-primary" [disabled]="generating() || !creatableGeneratedVariants().length" (click)="createGeneratedVariants()">
                {{ generating() ? generationProgressLabel() : 'Crear ' + creatableGeneratedVariants().length + ' variantes' }}
              </button>
            </div>
          </section>
        </div>
      }

      @if (deletionTarget()) {
        <div class="dialog-backdrop">
          <section class="dialog danger-dialog" role="dialog" aria-modal="true" aria-labelledby="deletion-title">
            <header>
              <h2 id="deletion-title">{{ deletionTarget()!.kind === 'product' ? 'Eliminar producto' : 'Eliminar variante' }}</h2>
              <button type="button" class="close-button" (click)="cancelDeletion()" [disabled]="deleting()" aria-label="Cerrar">×</button>
            </header>
            <p>
              ¿Querés eliminar {{ deletionTarget()!.kind === 'product' ? 'el producto' : 'la variante' }}
              <strong>“{{ deletionTarget()!.name }}”</strong>?
            </p>
            <p class="muted">
              Si posee ventas o movimientos históricos, se archivará en lugar de borrarse para conservar los registros.
            </p>
            <div class="actions">
              <button type="button" class="button button-quiet" (click)="cancelDeletion()" [disabled]="deleting()" autofocus>Cancelar</button>
              <button type="button" class="button button-danger" (click)="confirmDeletion()" [disabled]="deleting()">
                {{ deleting() ? 'Eliminando...' : deletionTarget()!.kind === 'product' ? 'Eliminar producto' : 'Eliminar variante' }}
              </button>
            </div>
          </section>
        </div>
      }

      @if (media()) {
        <div class="dialog-backdrop">
          <form class="dialog wide-dialog" (ngSubmit)="saveMedia()">
            <header>
              <h2>{{ media()!.id ? 'Editar imagen' : 'Nueva imagen' }}</h2>
              <button type="button" class="close-button" (click)="media.set(null)" aria-label="Cerrar">×</button>
            </header>
            <div class="media-form">
              <div class="form-grid">
                <label class="wide">URL de la imagen<input [(ngModel)]="media()!.url" name="mediaUrl" type="url" required /></label>
                <label class="wide">
                  Descripción de la imagen
                  <input
                    [(ngModel)]="media()!.alt"
                    name="mediaDescription"
                    required
                    placeholder="Taza Gatarsis color lila con logo blanco"
                  />
                  <small>Describe brevemente lo que aparece en la foto. Se usa para accesibilidad si la imagen no puede verse.</small>
                </label>
                <label>Orden<input [(ngModel)]="media()!.sortOrder" name="mediaSortOrder" type="number" /></label>
                <label class="check align-end">
                  <input [(ngModel)]="media()!.isCover" name="mediaCover" type="checkbox" />
                  {{ media()!.variantId ? 'Portada de esta variante' : 'Portada del producto' }}
                </label>
              </div>
              <div class="media-preview draft">
                @if (media()!.url) {
                  <img [src]="media()!.url" [alt]="media()!.alt || 'Vista previa de imagen'" (error)="draftImageFailed.set(true)" />
                }
                @if (draftImageFailed()) {
                  <span>No se pudo cargar la imagen.</span>
                }
              </div>
            </div>
            @if (mediaError()) {
              <p class="feedback error" aria-live="polite">{{ mediaError() }}</p>
            }
            <div class="actions">
              <button type="button" class="button button-quiet" (click)="media.set(null)">Cancelar</button>
              <button class="button button-primary" [disabled]="mediaInvalid()">Guardar imagen</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styleUrl: './admin-pages.css',
})
export class AdminProductEditorComponent implements OnInit {
  private readonly photoSwipe = inject(PhotoSwipeService);
  id: string | null = null;
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly product = signal<AdminProductDetail | null>(null);
  readonly variant = signal<VariantForm | null>(null);
  readonly variantGenerator = signal<VariantGeneratorForm | null>(null);
  readonly generatedVariants = signal<GeneratedVariantDraft[]>([]);
  readonly generating = signal(false);
  readonly generationResult = signal('');
  readonly generationProgress = signal({ created: 0, total: 0, failed: 0 });
  readonly deletionTarget = signal<DeletionTarget | null>(null);
  readonly deleting = signal(false);
  readonly media = signal<MediaForm | null>(null);
  readonly initialMedia = signal<MediaForm>(defaultInitialMedia());
  readonly notice = signal<AdminFeedback | null>(null);
  readonly mediaError = signal('');
  readonly initialMediaError = signal('');
  readonly failedImages = signal(new Set<string>());
  readonly draftImageFailed = signal(false);
  readonly initialImageFailed = signal(false);
  readonly commonSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  model: ProductForm = {
    name: '',
    slug: '',
    shortDescription: '',
    featured: false,
    sortOrder: 0,
    active: true,
  };

  constructor(
    private readonly api: AdminApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly globalFeedback: AdminFeedbackService,
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('productId');
    if (this.id) this.loadProduct();
  }

  ars(value: number): string {
    return formatArsFromCents(value);
  }

  generalMedia(): AdminProductMedia[] {
    return this.sortedMedia(this.product()?.media.filter((item) => !item.variantId) ?? []);
  }

  variantMedia(variantId: string): AdminProductMedia[] {
    return this.sortedMedia(this.product()?.media.filter((item) => item.variantId === variantId) ?? []);
  }

  variantPreview(variant: AdminProductVariant): AdminProductMedia | null {
    return this.coverFrom(this.variantMedia(variant.id)) ?? this.coverFrom(this.generalMedia());
  }

  async openMediaViewer(media: readonly AdminProductMedia[], index: number): Promise<void> {
    await this.photoSwipe.open(
      media.map((item) => ({
        src: item.url,
        alt: item.alt,
        width: 1600,
        height: 1200,
      }) satisfies RescueImage),
      index,
    );
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  canLeave(): boolean {
    return !this.dirty() || confirm('Hay cambios sin guardar. ¿Querés salir?');
  }

  saveProduct(): void {
    if (!this.id && this.initialMediaInvalid()) {
      this.initialMediaError.set(this.initialMediaValidationMessage());
      return;
    }
    this.saving.set(true);
    const request = this.id ? this.updateRequest() : this.createRequest();
    const initialMedia = this.id ? null : this.initialMediaBody();
    const operation = this.id
      ? this.api.updateProduct(this.id, request as UpdateAdminProductRequest)
      : this.api.createProduct(request as CreateAdminProductRequest);
    operation.subscribe({
      next: (saved) => {
        const isNew = !this.id;
        this.id = saved.id;
        this.dirty.set(false);
        if (isNew && initialMedia) {
          this.api.createMedia(saved.id, initialMedia).subscribe({
            next: () => {
              this.initialMedia.set(defaultInitialMedia());
              this.initialMediaError.set('');
              this.feedback('success', 'Producto creado con imagen.');
              void this.router.navigate(['/admin/products', saved.id]);
              this.loadProduct();
            },
            error: (error: unknown) => {
              this.initialMediaError.set(mediaErrorMessage(error));
              this.feedback('success', 'Producto creado. Revisá la imagen inicial.');
              void this.router.navigate(['/admin/products', saved.id]);
              this.loadProduct();
            },
            complete: () => this.saving.set(false),
          });
          return;
        }
        this.feedback('success', isNew ? 'Producto creado.' : 'Producto actualizado.');
        if (isNew) void this.router.navigate(['/admin/products', saved.id]);
        this.loadProduct();
      },
      error: (error: unknown) => {
        this.feedback('error', adminErrorMessage(error, 'No pudimos guardar los cambios.'));
        this.saving.set(false);
      },
      complete: () => {
        if (!initialMedia) this.saving.set(false);
      },
    });
  }

  updateInitialMedia(field: keyof MediaForm, value: string | number | boolean): void {
    this.initialMedia.update((draft) => ({
      ...draft,
      [field]: field === 'sortOrder' ? Number(value) : value,
    }));
    this.initialMediaError.set('');
    if (field === 'url') this.initialImageFailed.set(false);
    this.markDirty();
  }

  initialMediaInvalid(): boolean {
    return !!this.initialMediaValidationMessage();
  }

  initialMediaValidationMessage(): string {
    if (this.id || !this.initialMediaRequested()) return '';
    const draft = this.initialMedia();
    if (!draft.url.trim()) return 'Ingresá una URL válida para la imagen.';
    if (draft.alt.trim().length < 1) return 'Ingresá una descripción de la imagen.';
    return '';
  }

  openVariantGenerator(legacy?: AdminProductVariant): void {
    const color = legacy ? variantValue(legacy, 'color') : '';
    const legacySizes = legacy ? splitLegacySizes(variantValue(legacy, 'size')) : [];
    const next: VariantGeneratorForm = {
      models: legacy && variantValue(legacy, 'model') ? [variantValue(legacy, 'model')] : [],
      modelInput: '',
      colors: color ? [color] : [],
      colorInput: '',
      sizes: legacySizes,
      customSize: '',
      price: legacy ? centsToArsInput(legacy.priceInCents) : '',
      skuPrefix: skuPrefix(this.product()?.slug || this.model.slug),
      sortOrder: this.nextVariantSortOrder(),
      initialStock: 0,
      active: true,
    };
    this.variantGenerator.set(next);
    this.generationResult.set('');
    this.generationProgress.set({ created: 0, total: 0, failed: 0 });
    this.refreshGeneratedVariants();
  }

  closeVariantGenerator(): void {
    if (this.generating()) return;
    this.variantGenerator.set(null);
    this.generatedVariants.set([]);
    this.generationResult.set('');
  }

  updateVariantGenerator(field: keyof VariantGeneratorForm, value: string | number | boolean): void {
    this.variantGenerator.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        [field]: field === 'sortOrder' || field === 'initialStock' ? Number(value) : value,
      } as VariantGeneratorForm;
    });
    if (field !== 'modelInput' && field !== 'colorInput' && field !== 'customSize') this.refreshGeneratedVariants();
  }

  addGeneratorColor(): void {
    const draft = this.variantGenerator();
    const color = draft?.colorInput.trim();
    if (!draft || !color || draft.colors.some((item) => normalized(item) === normalized(color))) return;
    this.variantGenerator.set({ ...draft, colors: [...draft.colors, color], colorInput: '' });
    this.refreshGeneratedVariants();
  }

  addGeneratorModel(): void {
    const draft = this.variantGenerator();
    const model = draft?.modelInput.trim();
    if (!draft || !model || draft.models.some((item) => normalized(item) === normalized(model))) return;
    this.variantGenerator.set({ ...draft, models: [...draft.models, model], modelInput: '' });
    this.refreshGeneratedVariants();
  }

  removeGeneratorModel(model: string): void {
    this.variantGenerator.update((draft) =>
      draft ? { ...draft, models: draft.models.filter((item) => item !== model) } : draft,
    );
    this.refreshGeneratedVariants();
  }

  variantDimensions(item: AdminProductVariant): string {
    return (['model', 'color', 'size'] as const).map((key) => variantValue(item, key)).filter(Boolean).join(' / ') || 'Sin opciones';
  }

  generatedDimensions(item: GeneratedVariantDraft): string {
    return [item.model, item.color, item.size].filter(Boolean).join(' / ');
  }

  removeGeneratorColor(color: string): void {
    this.variantGenerator.update((draft) =>
      draft ? { ...draft, colors: draft.colors.filter((item) => item !== color) } : draft,
    );
    this.refreshGeneratedVariants();
  }

  toggleGeneratorSize(size: string): void {
    this.variantGenerator.update((draft) => {
      if (!draft) return draft;
      return {
        ...draft,
        sizes: draft.sizes.includes(size)
          ? draft.sizes.filter((item) => item !== size)
          : [...draft.sizes, size],
      };
    });
    this.refreshGeneratedVariants();
  }

  addCustomGeneratorSize(): void {
    const draft = this.variantGenerator();
    const size = draft?.customSize.trim();
    if (!draft || !size || !isSingleSize(size) || draft.sizes.some((item) => normalized(item) === normalized(size))) {
      return;
    }
    this.variantGenerator.set({ ...draft, sizes: [...draft.sizes, size], customSize: '' });
    this.refreshGeneratedVariants();
  }

  removeGeneratorSize(size: string): void {
    this.variantGenerator.update((draft) =>
      draft ? { ...draft, sizes: draft.sizes.filter((item) => item !== size) } : draft,
    );
    this.refreshGeneratedVariants();
  }

  customGeneratorSizes(): string[] {
    return this.variantGenerator()?.sizes.filter((size) => !this.commonSizes.includes(size)) ?? [];
  }

  refreshGeneratedVariants(): void {
    const draft = this.variantGenerator();
    if (!draft) return;
    const colors = draft.colors.length ? draft.colors : [''];
    const sizes = draft.sizes.length ? draft.sizes : [''];
    if (!draft.models.length && !draft.colors.length && !draft.sizes.length) {
      this.generatedVariants.set([]);
      return;
    }
    const existing = this.product()?.variants ?? [];
    const combinations = (draft.models.length ? draft.models : ['']).flatMap((model) =>
      colors.flatMap((color) => sizes.map((size) => ({ model, color, size }))),
    );
    const rows = combinations.map(({ model, color, size }, index) => ({
        model,
        color,
        size,
        name: [this.product()?.name || this.model.name, model, color, size].filter(Boolean).join(' '),
        sku: generatedSku(draft.skuPrefix, model, color, size),
        price: draft.price,
        active: draft.active,
        sortOrder: Number(draft.sortOrder) + index,
        initialStock: Number(draft.initialStock),
        exists: existing.some((item) => sameCombination(item, model, color, size)),
        error: null,
      }));
    this.generatedVariants.set(this.withDuplicateSkuErrors(rows));
    this.generationResult.set('');
  }

  updateGeneratedVariant(
    index: number,
    field: 'name' | 'sku' | 'price' | 'initialStock' | 'active',
    value: string | number | boolean,
  ): void {
    this.generatedVariants.update((items) =>
      this.withDuplicateSkuErrors(items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === 'initialStock' ? Number(value) : value }
          : item,
      )),
    );
    this.generationResult.set('');
  }

  creatableGeneratedVariants(): GeneratedVariantDraft[] {
    return this.generatedVariants().filter((item) => !item.exists && !item.error);
  }

  hasLegacyMultipleSizes(item: AdminProductVariant): boolean {
    return splitLegacySizes(variantValue(item, 'size')).length > 1;
  }

  generationHasFailures(): boolean {
    return this.generationProgress().failed > 0;
  }

  generationProgressLabel(): string {
    const progress = this.generationProgress();
    return 'Creando ' + (progress.created + progress.failed) + ' de ' + progress.total + '...';
  }

  createGeneratedVariants(): void {
    if (!this.id || this.generating()) return;
    const queue = this.creatableGeneratedVariants();
    if (!queue.length) return;
    this.generating.set(true);
    this.generationProgress.set({ created: 0, total: queue.length, failed: 0 });
    this.generationResult.set('');
    this.createNextGeneratedVariant(queue);
  }

  private createNextGeneratedVariant(queue: GeneratedVariantDraft[]): void {
    const draft = queue.shift();
    if (!draft || !this.id) {
      const progress = this.generationProgress();
      this.generating.set(false);
      this.generationResult.set(
        progress.failed
          ? progress.created + ' variantes creadas y ' + progress.failed + ' no pudieron crearse. Corregí las filas marcadas y volvé a intentarlo.'
          : progress.created + ' variantes creadas. Recordá cargar el stock de cada combinación.',
      );
      this.feedback(
        progress.failed ? 'error' : 'success',
        progress.failed ? 'La generación terminó con errores.' : 'Variantes creadas. Recordá cargar el stock.',
      );
      this.loadProduct();
      return;
    }
    const priceInCents = arsToCents(draft.price);
    if (
      priceInCents === null ||
      priceInCents < 1 ||
      !draft.name.trim() ||
      !draft.sku.trim() ||
      !Number.isInteger(Number(draft.initialStock)) ||
      Number(draft.initialStock) < 0
    ) {
      this.markGeneratedVariantError(draft.sku, 'Revisá nombre, SKU, precio y stock inicial.');
      this.generationProgress.update((progress) => ({ ...progress, failed: progress.failed + 1 }));
      this.createNextGeneratedVariant(queue);
      return;
    }
    const attributes = {
      ...(draft.model.trim() ? { model: draft.model.trim() } : {}),
      ...(draft.color.trim() ? { color: draft.color.trim() } : {}),
      ...(draft.size.trim() ? { size: draft.size.trim() } : {}),
    };
    const body: CreateAdminVariantRequest = {
      name: draft.name.trim(),
      sku: draft.sku.trim(),
      model: nullable(draft.model),
      color: nullable(draft.color),
      size: nullable(draft.size),
      ...(Object.keys(attributes).length ? { attributes } : {}),
      priceInCents,
      active: draft.active,
      sortOrder: draft.sortOrder,
      lowStockThreshold: null,
      initialStock: Number(draft.initialStock),
    };
    this.api.createVariant(this.id, body).subscribe({
      next: () => {
        this.generationProgress.update((progress) => ({ ...progress, created: progress.created + 1 }));
        this.createNextGeneratedVariant(queue);
      },
      error: (error: unknown) => {
        this.markGeneratedVariantError(draft.sku, adminErrorMessage(error, 'No se pudo crear.'));
        this.generationProgress.update((progress) => ({ ...progress, failed: progress.failed + 1 }));
        this.createNextGeneratedVariant(queue);
      },
    });
  }

  private markGeneratedVariantError(sku: string, error: string): void {
    this.generatedVariants.update((items) =>
      items.map((item) => item.sku === sku ? { ...item, error } : item),
    );
  }

  private withDuplicateSkuErrors(items: GeneratedVariantDraft[]): GeneratedVariantDraft[] {
    const repeated = new Set(
      items
        .map((item) => normalized(item.sku))
        .filter((sku, index, values) => sku && values.indexOf(sku) !== index),
    );
    return items.map((item) => ({
      ...item,
      error: repeated.has(normalized(item.sku)) ? 'SKU repetido en la vista previa.' : null,
    }));
  }

  private nextVariantSortOrder(): number {
    const variants = this.product()?.variants ?? [];
    return variants.length ? Math.max(...variants.map((item) => item.sortOrder)) + 1 : 0;
  }

  newVariant(): void {
    this.variant.set({
      id: null,
      model: '',
      sku: '',
      name: '',
      color: '',
      size: '',
      price: '',
      active: true,
      sortOrder: 0,
      lowStockThreshold: null,
      initialStock: 0,
    });
  }

  editVariant(item: AdminProductVariant): void {
    this.variant.set({
      id: item.id,
      model: variantValue(item, 'model'),
      sku: item.sku,
      name: item.name,
      color: item.attributes?.['color'] ?? item.color ?? '',
      size: item.attributes?.['size'] ?? item.size ?? '',
      price: (item.priceInCents / 100).toFixed(2).replace('.', ','),
      active: item.active,
      sortOrder: item.sortOrder,
      lowStockThreshold: item.lowStockThreshold,
      initialStock: 0,
    });
  }

  saveVariant(): void {
    const draft = this.variant();
    if (!this.id || !draft) return;
    if (!isSingleSize(draft.size)) {
      this.feedback('error', 'Cada variante debe tener un solo talle.');
      return;
    }
    const priceInCents = arsToCents(draft.price);
    if (priceInCents === null || priceInCents < 1) {
      this.feedback('error', 'Ingresá un precio válido.');
      return;
    }
    const attributes = variantAttributes(draft);
    if ((this.product()?.variants ?? []).some((item) =>
      item.id !== draft.id && sameCombination(item, draft.model, draft.color, draft.size),
    )) {
      this.feedback('error', 'Ya existe una variante con ese modelo, color y talle.');
      return;
    }
    const baseBody: UpdateAdminVariantRequest = {
      sku: draft.sku,
      name: draft.name,
      model: nullable(draft.model),
      color: nullable(draft.color),
      size: nullable(draft.size),
      attributes: attributes ?? {},
      priceInCents,
      active: draft.active,
      sortOrder: draft.sortOrder,
      lowStockThreshold: draft.lowStockThreshold,
    };
    if (!draft.id && (!Number.isInteger(Number(draft.initialStock)) || Number(draft.initialStock) < 0)) {
      this.feedback('error', 'Ingresá un stock inicial entero igual o mayor a cero.');
      return;
    }
    const body: CreateAdminVariantRequest = {
      sku: draft.sku,
      name: draft.name,
      model: nullable(draft.model),
      color: nullable(draft.color),
      size: nullable(draft.size),
      ...(attributes ? { attributes } : {}),
      priceInCents,
      active: draft.active,
      sortOrder: draft.sortOrder,
      lowStockThreshold: draft.lowStockThreshold,
      initialStock: Number(draft.initialStock),
    };
    const operation = draft.id
      ? this.api.updateVariant(draft.id, baseBody)
      : this.api.createVariant(this.id, body);
    operation.subscribe({
      next: () => {
        this.variant.set(null);
        this.feedback('success', draft.id ? 'Variante actualizada.' : 'Variante creada.');
        this.loadProduct();
      },
      error: (error: unknown) =>
        this.feedback('error', adminErrorMessage(error, 'No pudimos guardar la variante.')),
    });
  }

  newMedia(variantId: string | null = null): void {
    this.draftImageFailed.set(false);
    this.mediaError.set('');
    this.media.set({ id: null, variantId, url: '', alt: '', sortOrder: 0, isCover: false });
  }

  editMedia(item: AdminProductMedia): void {
    this.draftImageFailed.set(false);
    this.mediaError.set('');
    this.media.set({
      id: item.id,
      variantId: item.variantId ?? null,
      url: item.url,
      alt: item.alt,
      sortOrder: item.sortOrder,
      isCover: item.isCover,
    });
  }

  mediaInvalid(): boolean {
    const draft = this.media();
    return !draft || !draft.url.trim() || draft.alt.trim().length < 1;
  }

  saveMedia(): void {
    const draft = this.media();
    if (!this.id || !draft) return;
    this.mediaError.set('');
    if (draft.alt.trim().length < 1) {
      this.mediaError.set('Ingresá una descripción de la imagen.');
      return;
    }
    if (!draft.url.trim()) {
      this.mediaError.set('Ingresá una URL válida para la imagen.');
      return;
    }
    const body: CreateAdminProductMediaRequest = {
      url: draft.url.trim(),
      alt: draft.alt.trim(),
      sortOrder: draft.sortOrder,
      isCover: draft.isCover,
    };
    if (!draft.id && draft.variantId) body.variantId = draft.variantId;
    const operation = draft.id
      ? this.api.updateMedia(draft.id, body as UpdateAdminProductMediaRequest)
      : this.api.createMedia(this.id, body);
    operation.subscribe({
      next: () => {
        this.media.set(null);
        this.mediaError.set('');
        this.feedback('success', draft.id ? 'Imagen actualizada.' : 'Imagen agregada.');
        this.loadProduct();
      },
      error: (error: unknown) => this.mediaError.set(mediaErrorMessage(error)),
    });
  }

  requestProductDeletion(): void {
    const product = this.product();
    if (!product) return;
    this.deletionTarget.set({ kind: 'product', id: product.id, name: product.name });
  }

  requestVariantDeletion(item: AdminProductVariant): void {
    this.deletionTarget.set({
      kind: 'variant',
      id: item.id,
      name: variantDeletionLabel(item),
    });
  }

  cancelDeletion(): void {
    if (!this.deleting()) this.deletionTarget.set(null);
  }

  confirmDeletion(): void {
    const target = this.deletionTarget();
    if (!target || this.deleting()) return;
    this.deleting.set(true);
    const operation = target.kind === 'product'
      ? this.api.deleteProduct(target.id)
      : this.api.deleteVariant(target.id);
    operation.subscribe({
      next: (response) => {
        this.deleting.set(false);
        this.deletionTarget.set(null);
        if (target.kind === 'product') {
          const message = response.result === 'DELETED'
            ? 'Producto eliminado.'
            : 'El producto tenía historial asociado y fue archivado.';
          this.feedback('success', message);
          this.globalFeedback.show('success', message);
          void this.router.navigate(['/admin/products']);
          return;
        }
        this.variant.set(null);
        this.feedback(
          'success',
          response.result === 'DELETED'
            ? 'Variante eliminada.'
            : 'La variante tenía historial asociado y fue archivada.',
        );
        this.loadProduct();
      },
      error: (error: unknown) => {
        this.deleting.set(false);
        this.feedback('error', adminErrorMessage(error, 'No pudimos eliminar el elemento.'));
      },
    });
  }

  deleteMedia(item: AdminProductMedia): void {
    if (!confirm(`¿Eliminar esta imagen?\n\nSe quitará del producto, pero no modifica el archivo original.`)) {
      return;
    }
    this.api.deleteMedia(item.id).subscribe({
      next: () => {
        this.feedback('success', 'Imagen eliminada.');
        this.loadProduct();
      },
      error: (error: unknown) =>
        this.feedback('error', adminErrorMessage(error, 'No pudimos eliminar la imagen.')),
    });
  }

  markImageFailed(id: string): void {
    this.failedImages.update((items) => new Set([...items, id]));
  }

  private feedback(kind: AdminFeedbackKind, message: string): void {
    this.notice.set({ kind, message });
  }

  private loadProduct(): void {
    if (!this.id) return;
    this.api.product(this.id).subscribe({
      next: (product) => this.setProduct(product),
      error: (error: unknown) =>
        this.feedback('error', adminErrorMessage(error, 'No pudimos cargar el producto.')),
    });
  }

  private setProduct(product: AdminProductDetail): void {
    this.product.set(product);
    this.model = {
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription ?? '',
      featured: product.featured,
      sortOrder: product.sortOrder,
      active: product.active,
    };
  }

  private createRequest(): CreateAdminProductRequest {
    return {
      name: this.model.name,
      slug: this.model.slug,
      shortDescription: this.model.shortDescription || undefined,
      active: this.model.active,
      featured: this.model.featured,
      sortOrder: this.model.sortOrder,
    };
  }

  private updateRequest(): UpdateAdminProductRequest {
    return {
      name: this.model.name,
      slug: this.model.slug,
      shortDescription: nullable(this.model.shortDescription),
      active: this.model.active,
      featured: this.model.featured,
      sortOrder: this.model.sortOrder,
    };
  }

  private initialMediaRequested(): boolean {
    const draft = this.initialMedia();
    return !!draft.url.trim() || !!draft.alt.trim();
  }

  private initialMediaBody(): CreateAdminProductMediaRequest | null {
    if (!this.initialMediaRequested()) return null;
    const draft = this.initialMedia();
    return {
      url: draft.url.trim(),
      alt: draft.alt.trim(),
      sortOrder: draft.sortOrder,
      isCover: draft.isCover,
    };
  }

  private sortedMedia(media: AdminProductMedia[]): AdminProductMedia[] {
    return [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private coverFrom(media: AdminProductMedia[]): AdminProductMedia | null {
    return media.find((item) => item.isCover) ?? media[0] ?? null;
  }
}

function defaultInitialMedia(): MediaForm {
  return { id: null, variantId: null, url: '', alt: '', sortOrder: 0, isCover: true };
}

function nullable(value: string): string | null {
  return value.trim() || null;
}

interface VariantGeneratorForm {
  models: string[];
  modelInput: string;
  colors: string[];
  colorInput: string;
  sizes: string[];
  customSize: string;
  price: string;
  skuPrefix: string;
  sortOrder: number;
  initialStock: number;
  active: boolean;
}

interface GeneratedVariantDraft {
  model: string;
  color: string;
  size: string;
  name: string;
  sku: string;
  price: string;
  active: boolean;
  sortOrder: number;
  initialStock: number;
  exists: boolean;
  error: string | null;
}

function variantAttributes(draft: VariantForm): Record<string, string> | undefined {
  const attributes = {
    ...(nullable(draft.model) ? { model: draft.model.trim() } : {}),
    ...(nullable(draft.color) ? { color: draft.color.trim() } : {}),
    ...(nullable(draft.size) ? { size: draft.size.trim() } : {}),
  };
  return Object.keys(attributes).length ? attributes : undefined;
}

function isSingleSize(value: string): boolean {
  return !value.trim() || (!/[,;/]/.test(value) && !/\s/.test(value.trim()));
}

function variantValue(variant: AdminProductVariant, key: 'model' | 'color' | 'size'): string {
  return variant.attributes?.[key] ?? variant[key] ?? '';
}

function variantDeletionLabel(variant: AdminProductVariant): string {
  const model = variantValue(variant, 'model');
  const color = variantValue(variant, 'color');
  const size = variantValue(variant, 'size');
  return [variant.name, model && 'Modelo ' + model, color && 'Color ' + color, size && 'Talle ' + size]
    .filter(Boolean)
    .join(' · ');
}

function splitLegacySizes(value: string): string[] {
  if (!/[,;/]/.test(value)) return [];
  return value
    .split(/[,;/]/)
    .map((item) => item.trim())
    .filter((item) => !!item && isSingleSize(item));
}

function sameCombination(variant: AdminProductVariant, model: string, color: string, size: string): boolean {
  return normalized(variantValue(variant, 'model')) === normalized(model)
    && normalized(variantValue(variant, 'color')) === normalized(color)
    && normalized(variantValue(variant, 'size')) === normalized(size);
}

function normalized(value: string): string {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function skuPrefix(value: string): string {
  return normalizeSkuPart(value);
}

function generatedSku(prefix: string, model: string, color: string, size: string): string {
  return [skuPrefix(prefix), normalizeSkuPart(model), color ? normalizeSkuPart(color).slice(0, 3) : '', size ? normalizeSkuPart(size) : '']
    .filter(Boolean)
    .join('-');
}

function normalizeSkuPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function centsToArsInput(value: number): string {
  return (value / 100).toFixed(2).replace('.', ',');
}

function arsToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimal = ''] = normalized.split('.');
  return Number(whole) * 100 + Number((decimal + '00').slice(0, 2));
}

function mediaErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (typeof error.error === 'string' && error.error.trim()) return error.error;
    if (typeof error.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }
  }
  return 'No pudimos guardar la imagen.';
}
