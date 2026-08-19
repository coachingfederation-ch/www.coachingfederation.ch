/**
 * Library entry point.
 *
 * Consumers import components from here; the theme is imported separately from
 * ./styles.css so styling stays a CSS import rather than a JS side effect.
 */
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
export { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
export { AspectRatio } from "./components/ui/aspect-ratio";
export { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
export { Badge, badgeVariants } from "./components/ui/badge";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";
export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "./components/ui/button-group";
export { Button, buttonVariants } from "./components/ui/button";
export { Calendar, CalendarDayButton } from "./components/ui/calendar";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./components/ui/carousel";
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "./components/ui/chart";
export { Checkbox } from "./components/ui/checkbox";
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/ui/collapsible";
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./components/ui/command";
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./components/ui/context-menu";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./components/ui/drawer";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./components/ui/form";
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./components/ui/hover-card";
export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./components/ui/input-group";
export {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "./components/ui/input-otp";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./components/ui/menubar";
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./components/ui/navigation-menu";
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./components/ui/pagination";
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./components/ui/popover";
export { Progress } from "./components/ui/progress";
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
export { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./components/ui/resizable";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
export { Separator } from "./components/ui/separator";
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar";
export { Skeleton } from "./components/ui/skeleton";
export { Slider } from "./components/ui/slider";
export { Toaster } from "./components/ui/sonner";
export { Spinner } from "./components/ui/spinner";
export { Switch } from "./components/ui/switch";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
export { Textarea } from "./components/ui/textarea";
export { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
export { Toggle, toggleVariants } from "./components/ui/toggle";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
export { CALLOUT_SHADES, Callout, SHADE_SWATCH, calloutShadeFrom } from "./components/callout";
export { SiteHeader } from "./components/chrome/SiteHeader";
export { SiteFooter } from "./components/chrome/SiteFooter";
export {
  CalloutSet,
  ChipRow,
  CompactHero,
  Marquee,
  PillarCards,
} from "./components/patterns/StyleGuidePatterns";
export { BrushMark, MarkedText } from "./components/brush/BrushMark";
export { MARKS, MARK_CATEGORY_LABELS, MARK_NAMES } from "./components/brush/marks";
export { Logo } from "./components/brand/Logo";
export { LOGOS, LOGO_MIN_SIZE, LOGO_NAMES } from "./components/brand/logos";
export { COLOR_GROUPS, PILLARS, RADII, TYPE_SCALE } from "./lib/design-tokens";
export { AiBadge, AiPhoto, type AiBadgeProps, type AiPhotoProps } from "./components/photography/AiPhoto";
export {
  AI_PHOTOGRAPHY,
  BEHAVIORS,
  TEXT_COLOR_CLASS,
  BRAND_STRATEGY,
  COLOR_RATIO,
  FORMAL_DEVICES,
  HIGHLIGHT_RULES,
  MASTER_STYLES,
  PHOTOGRAPHY,
  STYLISTIC_DEVICES,
  TEXT_COMBINATIONS,
  TYPE_ROLES,
  VOICE_STAGES,
  type Behavior,
  type CombinationRow,
} from "./lib/brand-guidelines";
export { cn } from "./lib/utils";
export {
  SOCIAL_FORMATS,
  SOCIAL_FORMAT_NAMES,
  SocialBanner,
  type SocialBannerProps,
  type SocialFormat,
  type SocialFormatName,
} from "./components/social/SocialBanner";
