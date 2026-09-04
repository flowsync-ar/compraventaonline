"use client"

import { Fragment, useMemo, useState } from "react"
import ExcelJS from "exceljs"
import CustomDropdown from "@/components/CustomDropdown"
import { imagesToWebp } from "@/lib/imageToWebp"
import { MAX_LISTING_IMAGES, prepareListingImageFiles } from "@/lib/listingImages"

type Category = { id: string; name: string; parent_id: string | null }

type BulkPreviewRow = {
  rowNumber: number
  valid: boolean
  reason?: string
  name?: string
  brand?: string | null
  description?: string | null
  price?: number
  currencyCode?: "ARS" | "USD"
  condition?: "NEW" | "USED"
  stock?: number
  attributes?: Record<string, string> | null
  categoryId: string | null
  images: string[]
}

export default function CompanyBulkUpload({
  sellerId,
  categories,
  onPublished,
}: {
  sellerId: string
  categories: Category[]
  onPublished: () => void
}) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewRows, setPreviewRows] = useState<BulkPreviewRow[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [uploadingRow, setUploadingRow] = useState<number | null>(null)
  const [rowDragOver, setRowDragOver] = useState<number | null>(null)
  const [draggingImage, setDraggingImage] = useState<{ row: number; index: number } | null>(null)
  const [search, setSearch] = useState("")
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [assignCategoryId, setAssignCategoryId] = useState("")
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [photoColumnDragOver, setPhotoColumnDragOver] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [publishErrors, setPublishErrors] = useState<string[]>([])

  const categoryOptions = useMemo(
    () => [
      { name: "Seleccioná una categoría", value: "" },
      ...categories
        .filter((cat) => !cat.parent_id)
        .flatMap((root) => [
          { name: root.name, value: root.id },
          ...categories
            .filter((cat) => cat.parent_id === root.id)
            .map((sub) => ({ name: sub.name, value: sub.id, groupLabel: root.name })),
        ]),
    ],
    [categories],
  )

  const filteredRows = useMemo(() => {
    if (!previewRows) return []
    const q = search.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (!q) return previewRows
    return previewRows.filter((r) =>
      (r.name ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(q),
    )
  }, [previewRows, search])

  const selectable = useMemo(
    () => filteredRows.filter((r) => r.valid).map((r) => r.rowNumber),
    [filteredRows],
  )

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet("Productos")
    sheet.columns = [
      { header: "Nombre", key: "name", width: 32 },
      { header: "Marca", key: "brand", width: 20 },
      { header: "Descripción", key: "description", width: 45 },
      { header: "Moneda", key: "currencyCode", width: 12 },
      { header: "Precio", key: "price", width: 12 },
      { header: "Condición", key: "condition", width: 12 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Atributos", key: "attributes", width: 30 },
    ]
    sheet.getRow(1).font = { bold: true }
    sheet.addRow({
      name: "Fiat Palio Weekend 2009",
      brand: "Fiat",
      description: "Muy buen estado, único dueño",
      currencyCode: "ARS",
      price: 7500000,
      condition: "USED",
      stock: 1,
      attributes: "year=2009;kilometers=140000",
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "plantilla_carga_masiva_empresa.xlsx"
    link.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setPreviewRows(null)
    setCsvFile(null)
    setPublishErrors([])
    setSearch("")
    setSelectedRows(new Set())
    setAssignCategoryId("")
  }

  const handlePreview = async () => {
    if (!csvFile) return
    setPreviewLoading(true)
    setError(null)
    setOk(null)
    setPublishErrors([])
    const form = new FormData()
    form.append("file", csvFile)
    try {
      const res = await fetch(`/api/admin/empresas/${sellerId}/bulk/preview`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No pudimos leer el archivo.")
      setPreviewRows(
        (data.rows as Omit<BulkPreviewRow, "categoryId" | "images">[]).map((r) => ({
          ...r,
          categoryId: null,
          images: [],
        })),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos leer el archivo.")
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleRowImages = async (rowNumber: number, files: FileList) => {
    const currentCount = previewRows?.find((r) => r.rowNumber === rowNumber)?.images.length ?? 0
    const { accepted, message } = await prepareListingImageFiles(files, currentCount)
    if (message) setError(message)
    if (accepted.length === 0) return
    setUploadingRow(rowNumber)
    try {
      const webp = await imagesToWebp(accepted)
      const form = new FormData()
      form.append("rowNumber", String(rowNumber))
      for (const file of webp) form.append("files", file)
      const res = await fetch(`/api/admin/empresas/${sellerId}/bulk/images`, {
        method: "POST",
        credentials: "include",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudieron subir las fotos.")
      const urls: string[] = data.urls ?? []
      setPreviewRows((prev) =>
        prev ? prev.map((r) => (r.rowNumber === rowNumber ? { ...r, images: [...r.images, ...urls] } : r)) : prev,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron subir las fotos.")
    } finally {
      setUploadingRow(null)
    }
  }

  const handlePublish = async () => {
    if (!previewRows) return
    const ready = previewRows.filter((r) => r.valid && r.categoryId)
    if (ready.length === 0) return
    setConfirming(true)
    setError(null)
    setOk(null)
    setPublishErrors([])
    try {
      const res = await fetch(`/api/admin/empresas/${sellerId}/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: ready.map((r) => ({
            name: r.name,
            brand: r.brand,
            description: r.description,
            price: r.price,
            currencyCode: r.currencyCode,
            condition: r.condition,
            stock: r.stock,
            attributes: r.attributes,
            categoryId: r.categoryId,
            images: r.images,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "No se pudieron publicar los productos.")
      const failed: { row: number; reason: string }[] = data.failed ?? []
      if (failed.length > 0) {
        setPublishErrors(failed.map((f) => `Fila ${f.row}: ${f.reason}`))
      }
      if (data.inserted > 0) {
        setOk(
          failed.length > 0
            ? `Se crearon ${data.inserted} publicaciones. ${failed.length} tuvieron errores.`
            : `Se publicaron ${data.inserted} productos a nombre de esta empresa.`,
        )
        reset()
        onPublished()
      } else {
        throw new Error("Ninguna fila pudo publicarse.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron publicar los productos.")
    } finally {
      setConfirming(false)
    }
  }

  const readyCount = previewRows?.filter((r) => r.valid && r.categoryId).length ?? 0

  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-5 flex flex-col gap-5">
      <div>
        <h2 className="font-heading text-sm font-extrabold">Carga masiva</h2>
        <p className="text-[11px] text-text-muted mt-1">
          Subí un Excel, asigná categoría y fotos, y publicá varios productos de una vez a nombre de esta empresa.
        </p>
      </div>

      {error && <p className="text-sm text-red-500 font-bold">{error}</p>}
      {ok && <p className="text-sm text-accent-green font-bold">{ok}</p>}

      {!previewRows ? (
        <>
          <div className="rounded-xl border border-card-border bg-background/40 p-4 text-xs text-text-muted flex flex-col gap-2">
            <p>1. Descargá la plantilla e ingresá nombre y precio (el resto es opcional).</p>
            <p>2. Subí el archivo. Después elegís categoría y fotos por producto, o a varias filas juntas.</p>
            <p>
              Columnas: <strong>Nombre, Precio</strong>. Opcionales: Marca, Descripción, Moneda (ARS/USD), Condición (NEW/USED), Stock, Atributos (`clave=valor;clave=valor`).
            </p>
            <button
              type="button"
              onClick={() => void downloadTemplate()}
              className="self-start mt-1 rounded-lg border border-accent-gold/30 bg-accent-gold/5 px-3 py-2 text-[11px] font-bold text-accent-gold cursor-pointer"
            >
              Descargar plantilla Excel
            </button>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center gap-3 ${
              isDragging
                ? "border-accent-gold bg-accent-gold/5"
                : csvFile
                  ? "border-accent-green/40 bg-accent-green/5"
                  : "border-card-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files[0]) setCsvFile(e.dataTransfer.files[0])
            }}
          >
            {csvFile ? (
              <p className="text-xs font-bold">{csvFile.name}</p>
            ) : (
              <p className="text-xs font-bold">Arrastrá el Excel acá o elegilo</p>
            )}
            <input
              type="file"
              accept=".xlsx"
              id="empresa-bulk-file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) setCsvFile(e.target.files[0])
              }}
            />
            <label
              htmlFor="empresa-bulk-file"
              className="rounded-lg border border-card-border px-4 py-2 text-[11px] font-bold cursor-pointer"
            >
              {csvFile ? "Elegir otro archivo" : "Seleccionar archivo"}
            </label>
          </div>

          <button
            type="button"
            disabled={!csvFile || previewLoading}
            onClick={() => void handlePreview()}
            className="self-start rounded-xl bg-accent-gold px-4 py-2 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
          >
            {previewLoading ? "Leyendo…" : "Continuar y revisar"}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-text-muted">
              {readyCount} de {previewRows.length} filas listas para publicar.
            </p>
            <button type="button" onClick={reset} className="text-[11px] font-bold text-text-muted cursor-pointer">
              ← Elegir otro archivo
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre…"
              className="flex-1 bg-background border border-card-border rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-accent-gold"
            />
            {selectable.length > 0 && (
              <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectable.every((n) => selectedRows.has(n))}
                  onChange={() => {
                    const all = selectable.every((n) => selectedRows.has(n))
                    setSelectedRows(all ? new Set() : new Set(selectable))
                  }}
                />
                Seleccionar {search.trim() ? "filtrados" : "todos"} ({selectable.length})
              </label>
            )}
          </div>

          {selectedRows.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/5 p-3">
              <div className="flex-1 max-w-xs">
                <CustomDropdown
                  name="empresa-bulk-assign-category"
                  defaultValue={assignCategoryId}
                  onChange={setAssignCategoryId}
                  options={categoryOptions}
                  showSearch
                  placeholder="Buscar categoría..."
                />
              </div>
              <button
                type="button"
                disabled={!assignCategoryId}
                onClick={() => {
                  setPreviewRows((prev) =>
                    prev
                      ? prev.map((r) => (selectedRows.has(r.rowNumber) ? { ...r, categoryId: assignCategoryId } : r))
                      : prev,
                  )
                }}
                className="rounded-lg bg-accent-gold px-4 py-2 text-[11px] font-extrabold text-background disabled:opacity-40 cursor-pointer"
              >
                Aplicar categoría
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewRows((prev) => (prev ? prev.filter((r) => !selectedRows.has(r.rowNumber)) : prev))
                  setSelectedRows(new Set())
                }}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-[11px] font-extrabold text-red-500 cursor-pointer"
              >
                Quitar filas
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-card-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-text-muted border-b border-card-border bg-background/40">
                  <th className="p-3 w-8" />
                  <th className="p-3">Producto</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Precio</th>
                  <th className="p-3 text-center">Fotos</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const categoryName = row.categoryId ? categories.find((c) => c.id === row.categoryId)?.name : null
                  const isExpanded = expandedRow === row.rowNumber
                  return (
                    <Fragment key={row.rowNumber}>
                      <tr className={!row.valid ? "bg-red-500/5" : ""}>
                        <td className="p-3">
                          {row.valid && (
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.rowNumber)}
                              onChange={() => {
                                setSelectedRows((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(row.rowNumber)) next.delete(row.rowNumber)
                                  else next.add(row.rowNumber)
                                  return next
                                })
                              }}
                            />
                          )}
                        </td>
                        <td className="p-3">
                          {row.valid ? (
                            <div>
                              <p className="font-bold">{row.name}</p>
                              {row.brand && <p className="text-[10px] text-text-muted">{row.brand}</p>}
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-red-500">Fila {row.rowNumber}</p>
                              <p className="text-[10px] text-red-500/80">{row.reason}</p>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {row.valid ? categoryName ?? <span className="text-yellow-600">Sin categoría</span> : "—"}
                        </td>
                        <td className="p-3 text-right font-extrabold whitespace-nowrap">
                          {row.valid
                            ? `${row.currencyCode === "USD" ? "US$" : "$"}${Number(row.price).toLocaleString("es-AR")}`
                            : "—"}
                        </td>
                        <td className="p-3 text-center">
                          {row.valid ? (
                            <label
                              htmlFor={`empresa-bulk-photo-${row.rowNumber}`}
                              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border overflow-hidden cursor-pointer ${
                                photoColumnDragOver === row.rowNumber ? "border-accent-gold" : "border-card-border"
                              }`}
                              onDragOver={(e) => {
                                e.preventDefault()
                                setPhotoColumnDragOver(row.rowNumber)
                              }}
                              onDragLeave={() => setPhotoColumnDragOver(null)}
                              onDrop={(e) => {
                                e.preventDefault()
                                setPhotoColumnDragOver(null)
                                if (e.dataTransfer.files?.length) void handleRowImages(row.rowNumber, e.dataTransfer.files)
                              }}
                            >
                              {uploadingRow === row.rowNumber ? (
                                <span className="text-[8px]">…</span>
                              ) : row.images[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.images[0]} alt="" className="h-full w-full object-contain" />
                              ) : (
                                <span>📦</span>
                              )}
                              {row.images.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent-green text-white text-[8px] font-extrabold flex items-center justify-center">
                                  {row.images.length}
                                </span>
                              )}
                              <input
                                id={`empresa-bulk-photo-${row.rowNumber}`}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={uploadingRow === row.rowNumber}
                                onChange={(e) => {
                                  if (e.target.files?.length) void handleRowImages(row.rowNumber, e.target.files)
                                }}
                              />
                            </label>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center text-[9px] font-extrabold uppercase">
                          {!row.valid ? (
                            <span className="text-red-500">Error</span>
                          ) : row.categoryId ? (
                            <span className="text-accent-green">Lista</span>
                          ) : (
                            <span className="text-yellow-600">Pendiente</span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.valid && (
                            <button
                              type="button"
                              onClick={() => setExpandedRow(isExpanded ? null : row.rowNumber)}
                              className="text-text-muted cursor-pointer"
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && row.valid && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-background">
                            <div className="flex flex-col gap-3 max-w-md">
                              <CustomDropdown
                                name={`empresa-bulk-cat-${row.rowNumber}`}
                                defaultValue={row.categoryId ?? ""}
                                onChange={(val) =>
                                  setPreviewRows((prev) =>
                                    prev
                                      ? prev.map((r) => (r.rowNumber === row.rowNumber ? { ...r, categoryId: val } : r))
                                      : prev,
                                  )
                                }
                                options={categoryOptions}
                                showSearch
                                placeholder="Buscar categoría..."
                              />
                              <div
                                className={`border-2 border-dashed rounded-xl p-4 text-center text-[11px] ${
                                  rowDragOver === row.rowNumber ? "border-accent-gold" : "border-card-border"
                                }`}
                                onDragOver={(e) => {
                                  e.preventDefault()
                                  setRowDragOver(row.rowNumber)
                                }}
                                onDragLeave={() => setRowDragOver(null)}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  setRowDragOver(null)
                                  if (e.dataTransfer.files?.length) void handleRowImages(row.rowNumber, e.dataTransfer.files)
                                }}
                              >
                                {uploadingRow === row.rowNumber
                                  ? "Subiendo fotos…"
                                  : row.images.length >= MAX_LISTING_IMAGES
                                    ? `Máximo ${MAX_LISTING_IMAGES} fotos`
                                    : "Arrastrá fotos de este producto"}
                              </div>
                              {row.images.length > 0 && (
                                <div className="grid grid-cols-4 gap-2">
                                  {row.images.map((img, idx) => (
                                    <div
                                      key={`${img}-${idx}`}
                                      draggable
                                      onDragStart={() => setDraggingImage({ row: row.rowNumber, index: idx })}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={() => {
                                        if (!draggingImage || draggingImage.row !== row.rowNumber) return
                                        setPreviewRows((prev) =>
                                          prev
                                            ? prev.map((r) => {
                                                if (r.rowNumber !== row.rowNumber) return r
                                                const next = [...r.images]
                                                const [moved] = next.splice(draggingImage.index, 1)
                                                next.splice(idx, 0, moved)
                                                return { ...r, images: next }
                                              })
                                            : prev,
                                        )
                                        setDraggingImage(null)
                                      }}
                                      className="relative aspect-square rounded-lg overflow-hidden border border-card-border"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={img} alt="" className="h-full w-full object-contain" />
                                      {idx === 0 && (
                                        <span className="absolute bottom-1 left-1 bg-accent-gold text-white text-[8px] font-extrabold px-1 rounded">
                                          Portada
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewRows((prev) =>
                                            prev
                                              ? prev.map((r) =>
                                                  r.rowNumber === row.rowNumber
                                                    ? { ...r, images: r.images.filter((_, i) => i !== idx) }
                                                    : r,
                                                )
                                              : prev,
                                          )
                                        }
                                        className="absolute top-1 right-1 h-5 w-5 rounded bg-black/60 text-white text-[10px] cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {publishErrors.length > 0 && (
            <div className="text-xs text-red-500">
              {publishErrors.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={confirming || readyCount === 0}
            onClick={() => void handlePublish()}
            className="self-start rounded-xl bg-accent-gold px-4 py-2.5 text-xs font-extrabold text-background disabled:opacity-50 cursor-pointer"
          >
            {confirming ? "Publicando…" : `Publicar ${readyCount} productos`}
          </button>
        </>
      )}
    </div>
  )
}
