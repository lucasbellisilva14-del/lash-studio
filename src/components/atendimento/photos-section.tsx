"use client";

/**
 * Fotos antes/depois do atendimento: captura pela câmera (ou galeria),
 * grade de miniaturas e exclusão com confirmação.
 */
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { Card, CardBody } from "@/components/ui/card";
import { IconCamera, IconTrash } from "@/components/ui/icons";
import {
  deletePhotoAction,
  uploadPhotoAction,
  type PhotoState,
} from "@/app/(app)/atendimentos/[appointmentId]/actions";

export type PhotoItem = { id: string; kind: string; storageKey: string; thumbKey?: string | null };

export function PhotosSection({
  appointmentId,
  photos,
}: {
  appointmentId: string;
  photos: PhotoItem[];
}) {
  const antes = photos.filter((p) => p.kind === "ANTES");
  const depois = photos.filter((p) => p.kind === "DEPOIS");

  return (
    <Card>
      <CardBody>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-ink">Fotos</h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Antes e depois — o retrato da sua entrega
          </p>
        </div>
        <div className="space-y-5">
          <PhotoGroup
            appointmentId={appointmentId}
            kind="ANTES"
            title="Antes"
            photos={antes}
          />
          <PhotoGroup
            appointmentId={appointmentId}
            kind="DEPOIS"
            title="Depois"
            photos={depois}
          />
        </div>
      </CardBody>
    </Card>
  );
}

const initialState: PhotoState = {};

function PhotoGroup({
  appointmentId,
  kind,
  title,
  photos,
}: {
  appointmentId: string;
  kind: "ANTES" | "DEPOIS";
  title: string;
  photos: PhotoItem[];
}) {
  const [state, formAction, pending] = useActionState(uploadPhotoAction, initialState);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-xs text-ink-faint">
          {photos.length === 0
            ? "Nenhuma foto"
            : photos.length === 1
              ? "1 foto"
              : `${photos.length} fotos`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <Thumb key={photo.id} photo={photo} appointmentId={appointmentId} />
        ))}
        <form action={formAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="kind" value={kind} />
          <label
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed border-line",
              "flex flex-col items-center justify-center gap-1.5 text-ink-soft",
              "cursor-pointer transition-colors active:bg-surface-sunken",
              pending && "opacity-50 pointer-events-none",
            )}
          >
            <IconCamera width={22} height={22} />
            <span className="text-[11px] font-medium">
              {pending ? "Enviando..." : "Adicionar"}
            </span>
            <input
              type="file"
              name="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                if (e.currentTarget.files?.length) {
                  e.currentTarget.form?.requestSubmit();
                  e.currentTarget.value = "";
                }
              }}
            />
          </label>
        </form>
      </div>
      {state.error ? <p className="mt-2 text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}

function Thumb({ photo, appointmentId }: { photo: PhotoItem; appointmentId: string }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden border border-line bg-surface-sunken">
      <a href={`/api/uploads/${photo.storageKey}`} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/uploads/${photo.thumbKey ?? photo.storageKey}`}
          alt={photo.kind === "ANTES" ? "Foto de antes" : "Foto de depois"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </a>
      <form
        action={deletePhotoAction}
        onSubmit={(e) => {
          if (!window.confirm("Excluir esta foto?")) e.preventDefault();
        }}
        className="absolute top-1.5 right-1.5"
      >
        <input type="hidden" name="photoId" value={photo.id} />
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <DeleteButton />
      </form>
    </div>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label="Excluir foto"
      disabled={pending}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full",
        "bg-ink/60 text-white backdrop-blur-sm transition-opacity",
        pending && "opacity-50",
      )}
    >
      <IconTrash width={14} height={14} />
    </button>
  );
}
