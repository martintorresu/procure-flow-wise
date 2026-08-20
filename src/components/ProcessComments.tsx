import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddProcessComment, useProcessComments } from "@/hooks/useProcessComments";

interface Props {
  processId: string;
  tenantId: string;
  authorUserId: string;
  canComment: boolean;
}

export function ProcessComments({ processId, tenantId, authorUserId, canComment }: Props) {
  const [body, setBody] = useState("");
  const { data: comments = [], isLoading } = useProcessComments(processId);
  const add = useAddProcessComment();

  const submit = () => {
    if (!body.trim()) return;
    add.mutate(
      { processId, tenantId, authorUserId, body },
      {
        onSuccess: (res) => {
          setBody("");
          if (res?.emailWarning) {
            toast.warning("Comentario publicado, pero la notificación por email no pudo enviarse.");
            console.error("send-comment-notification:", res.emailWarning);
          }
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Comentarios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando comentarios…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(c.created_at).toLocaleString("es-CL")}
                </p>
              </li>
            ))}
          </ul>
        )}

        {canComment && (
          <div className="space-y-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe un comentario…"
              rows={3}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={submit} disabled={add.isPending || !body.trim()}>
                {add.isPending ? "Enviando…" : "Comentar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
